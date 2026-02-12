#include "storage.hpp"
#include "httplib.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <thread>
#include <chrono>

using json = nlohmann::json;

std::string urlDecode(const std::string& value) {
    std::string result;
    result.reserve(value.size());
    for (size_t i = 0; i < value.size(); ++i) {
        if (value[i] == '%' && i + 2 < value.size()) {
            int hex = std::stoi(value.substr(i + 1, 2), nullptr, 16);
            result += static_cast<char>(hex);
            i += 2;
        } else if (value[i] == '+') {
            result += ' ';
        } else {
            result += value[i];
        }
    }
    return result;
}

std::string escapeJson(const std::string& s) {
    std::string result;
    for (char c : s) {
        if (c == '"') result += "\\\"";
        else if (c == '\\') result += "\\\\";
        else if (c == '\n') result += "\\n";
        else if (c == '\r') result += "\\r";
        else if (c == '\t') result += "\\t";
        else result += c;
    }
    return result;
}

void setupCors(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

int main() {
    Storage storage;
    if (!storage.init()) {
        std::cerr << "Failed to init storage\n";
        return 1;
    }
    std::cout << "Storage initialized: ./storage/files/\n";

    httplib::Server svr;

    svr.set_default_headers({{"Content-Type", "application/json; charset=utf-8"}});

    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        setupCors(res);
        res.status = 204;
    });

    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        setupCors(res);
        res.set_content("{\"status\":\"ok\",\"message\":\"Storage API is running\"}", "application/json");
    });

    svr.Post("/api/storage/upload", [&storage](const httplib::Request& req, httplib::Response& res) {
        setupCors(res);
        if (!req.form.has_file("file")) {
            res.status = 400;
            res.set_content("{\"error\":\"No file uploaded\"}", "application/json");
            return;
        }
        auto file = req.form.get_file("file");
        std::string key = storage.saveFile(file.filename, file.content, file.content_type, file.content.size());
        if (key.empty()) {
            res.status = 500;
            res.set_content("{\"error\":\"Failed to save file\"}", "application/json");
            return;
        }
        storage.saveMetadata(key, file.filename, file.content_type, file.content.size());

        std::string json = "{\"success\":true,\"message\":\"File uploaded successfully\",\"file\":{"
            "\"key\":\"" + escapeJson(key) + "\","
            "\"location\":\"/api/storage/files/" + escapeJson(key) + "\","
            "\"bucket\":\"local-storage\","
            "\"originalName\":\"" + escapeJson(file.filename) + "\","
            "\"size\":" + std::to_string(file.content.size()) + ","
            "\"contentType\":\"" + escapeJson(file.content_type) + "\","
            "\"uploadedAt\":\"" + std::to_string(std::chrono::system_clock::to_time_t(std::chrono::system_clock::now())) + "\"}}";
        res.set_content(json, "application/json");
    });

    svr.Post("/api/storage/upload-multiple", [&storage](const httplib::Request& req, httplib::Response& res) {
        setupCors(res);
        auto files = req.form.get_files("files");
        if (files.empty()) {
            res.status = 400;
            res.set_content("{\"error\":\"No files uploaded\"}", "application/json");
            return;
        }
        std::string json = "{\"success\":true,\"message\":\"" + std::to_string(files.size()) + " file(s) uploaded successfully\",\"files\":[";
        bool first = true;
        for (const auto& file : files) {
            std::string key = storage.saveFile(file.filename, file.content, file.content_type, file.content.size());
            if (!key.empty()) {
                storage.saveMetadata(key, file.filename, file.content_type, file.content.size());
                if (!first) json += ",";
                json += "{\"key\":\"" + escapeJson(key) + "\",\"location\":\"/api/storage/files/" + escapeJson(key) + "\","
                    "\"bucket\":\"local-storage\",\"originalName\":\"" + escapeJson(file.filename) + "\","
                    "\"size\":" + std::to_string(file.content.size()) + ",\"contentType\":\"" + escapeJson(file.content_type) + "\","
                    "\"uploadedAt\":\"" + std::to_string(std::chrono::system_clock::to_time_t(std::chrono::system_clock::now())) + "\"}";
                first = false;
            }
        }
        json += "]}";
        res.set_content(json, "application/json");
    });

    svr.Get("/api/storage/files", [&storage](const httplib::Request&, httplib::Response& res) {
        setupCors(res);
        auto files = storage.listFiles();
        std::string json = "{\"success\":true,\"count\":" + std::to_string(files.size()) + ",\"files\":[";
        for (size_t i = 0; i < files.size(); ++i) {
            if (i > 0) json += ",";
            json += "{\"key\":\"" + escapeJson(files[i].key) + "\",\"size\":" + std::to_string(files[i].size) +
                ",\"lastModified\":\"" + escapeJson(files[i].lastModified) + "\","
                "\"contentType\":\"" + escapeJson(files[i].contentType) + "\","
                "\"originalName\":\"" + escapeJson(files[i].originalName) + "\"}";
        }
        json += "]}";
        res.set_content(json, "application/json");
    });

    svr.Get(R"(/api/storage/files/([^/]+)/view)", [&storage](const httplib::Request& req, httplib::Response& res) {
        setupCors(res);
        std::string key = urlDecode(req.matches[1].str());
        FileInfo info;
        if (!storage.getFileInfo(key, info)) {
            res.status = 404;
            res.set_content("{\"error\":\"File not found\"}", "application/json");
            return;
        }
        std::string content;
        if (!storage.readFile(key, content)) {
            res.status = 500;
            return;
        }
        res.set_header("Content-Type", info.contentType);
        res.set_content(content, info.contentType);
    });

    svr.Get(R"(/api/storage/files/([^/]+))", [&storage](const httplib::Request& req, httplib::Response& res) {
        setupCors(res);
        std::string key = urlDecode(req.matches[1].str());
        FileInfo info;
        if (!storage.getFileInfo(key, info)) {
            res.status = 404;
            res.set_content("{\"error\":\"File not found\"}", "application/json");
            return;
        }
        std::string json = "{\"success\":true,\"file\":{\"key\":\"" + escapeJson(info.key) + "\",\"size\":" +
            std::to_string(info.size) + ",\"lastModified\":\"" + escapeJson(info.lastModified) + "\","
            "\"contentType\":\"" + escapeJson(info.contentType) + "\",\"metadata\":{\"originalName\":\"" + escapeJson(info.originalName) + "\"}}}";
        res.set_content(json, "application/json");
    });

    svr.Get(R"(/api/storage/download/([^/]+))", [&storage](const httplib::Request& req, httplib::Response& res) {
        setupCors(res);
        std::string key = urlDecode(req.matches[1].str());
        FileInfo info;
        if (!storage.getFileInfo(key, info)) {
            res.status = 404;
            res.set_content("{\"error\":\"File not found\"}", "application/json");
            return;
        }
        std::string content;
        if (!storage.readFile(key, content)) {
            res.status = 500;
            res.set_content("{\"error\":\"Failed to read file\"}", "application/json");
            return;
        }
        res.set_header("Content-Type", info.contentType);
        res.set_header("Content-Disposition", "attachment; filename=\"" + escapeJson(info.originalName) + "\"");
        res.set_content(content, info.contentType);
    });

    svr.Get(R"(/api/storage/preview/([^/]+))", [&storage](const httplib::Request& req, httplib::Response& res) {
        setupCors(res);
        std::string key = urlDecode(req.matches[1].str());
        FileInfo info;
        if (!storage.getFileInfo(key, info)) {
            res.status = 404;
            res.set_content("{\"error\":\"File not found\"}", "application/json");
            return;
        }
        std::string url = "http://localhost:5000/api/storage/files/" + key + "/view";
        res.set_content("{\"success\":true,\"url\":\"" + url + "\",\"expiresIn\":null}", "application/json");
    });

    svr.Delete(R"(/api/storage/files/([^/]+))", [&storage](const httplib::Request& req, httplib::Response& res) {
        setupCors(res);
        std::string key = urlDecode(req.matches[1].str());
        if (storage.deleteFile(key)) {
            res.set_content("{\"success\":true,\"message\":\"File deleted successfully\",\"key\":\"" + escapeJson(key) + "\"}", "application/json");
        } else {
            res.status = 500;
            res.set_content("{\"error\":\"Failed to delete file\"}", "application/json");
        }
    });

    svr.Delete("/api/storage/files", [&storage](const httplib::Request& req, httplib::Response& res) {
        setupCors(res);
        json body;
        try {
            body = req.body.empty() ? json::object() : json::parse(req.body);
        } catch (...) {
            res.status = 400;
            res.set_content("{\"error\":\"Invalid JSON\"}", "application/json");
            return;
        }
        if (!body.contains("keys") || !body["keys"].is_array()) {
            res.status = 400;
            res.set_content("{\"error\":\"No keys provided\"}", "application/json");
            return;
        }
        size_t count = 0;
        for (const auto& k : body["keys"]) {
            if (storage.deleteFile(k.get<std::string>())) count++;
        }
        res.set_content("{\"success\":true,\"message\":\"" + std::to_string(count) + " file(s) deleted successfully\"}", "application/json");
    });

    std::cout << "Server running on http://localhost:5000\n";
    svr.listen("0.0.0.0", 5000);
    return 0;
}
