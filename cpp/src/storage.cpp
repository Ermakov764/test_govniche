#include "storage.hpp"
#include <fstream>
#include <filesystem>
#include <sstream>
#include <algorithm>
#include <dirent.h>
#include <sys/stat.h>

namespace fs = std::filesystem;

Storage::Storage() {
    storageDir_ = "storage";
    filesDir_ = storageDir_ + "/files";
    metadataDir_ = storageDir_ + "/metadata";
}

bool Storage::init() {
    try {
        fs::create_directories(filesDir_);
        fs::create_directories(metadataDir_);
        return true;
    } catch (...) {
        return false;
    }
}

std::string Storage::getMetadataPath(const std::string& key) const {
    return metadataDir_ + "/" + key + ".json";
}

std::string Storage::saveFile(const std::string& filename, const std::string& content,
                              const std::string& contentType, size_t size) {
    std::string key = std::to_string(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count()
    ) + "-" + filename;
    
    std::string filePath = filesDir_ + "/" + key;
    std::ofstream ofs(filePath, std::ios::binary);
    if (!ofs) return "";
    
    ofs.write(content.data(), content.size());
    ofs.close();
    
    return ofs ? key : "";
}

bool Storage::saveMetadata(const std::string& key, const std::string& originalName,
                           const std::string& contentType, size_t size) {
    std::string path = getMetadataPath(key);
    std::ofstream ofs(path);
    if (!ofs) return false;
    
    auto now = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    std::ostringstream oss;
    oss << "{\"originalName\":\"" << originalName << "\",\"contentType\":\"" 
        << contentType << "\",\"size\":" << size 
        << ",\"uploadedAt\":\"" << time << "\"}";
    
    ofs << oss.str();
    return true;
}

std::vector<FileInfo> Storage::listFiles() {
    std::vector<FileInfo> files;
    
    DIR* dir = opendir(filesDir_.c_str());
    if (!dir) return files;
    
    struct dirent* entry;
    while ((entry = readdir(dir)) != nullptr) {
        if (entry->d_name[0] == '.') continue;
        
        std::string key = entry->d_name;
        std::string filePath = filesDir_ + "/" + key;
        
        struct stat st;
        if (stat(filePath.c_str(), &st) != 0 || !S_ISREG(st.st_mode)) continue;
        
        FileInfo info;
        info.key = key;
        info.size = st.st_size;
        info.lastModified = std::to_string(st.st_mtime);
        info.originalName = key;
        
        std::ifstream mfs(getMetadataPath(key));
        if (mfs) {
            std::string line, content;
            while (std::getline(mfs, line)) content += line;
            size_t pos = content.find("\"originalName\":\"");
            if (pos != std::string::npos) {
                pos += 16;
                size_t end = content.find("\"", pos);
                if (end != std::string::npos) info.originalName = content.substr(pos, end - pos);
            }
            pos = content.find("\"contentType\":\"");
            if (pos != std::string::npos) {
                pos += 14;
                size_t end = content.find("\"", pos);
                if (end != std::string::npos) info.contentType = content.substr(pos, end - pos);
            }
        }
        if (info.contentType.empty()) info.contentType = "application/octet-stream";
        
        files.push_back(info);
    }
    closedir(dir);
    
    std::sort(files.begin(), files.end(), [](const FileInfo& a, const FileInfo& b) {
        return a.lastModified > b.lastModified;
    });
    
    return files;
}

bool Storage::getFileInfo(const std::string& key, FileInfo& info) {
    std::string filePath = filesDir_ + "/" + key;
    struct stat st;
    if (stat(filePath.c_str(), &st) != 0 || !S_ISREG(st.st_mode)) return false;
    
    info.key = key;
    info.size = st.st_size;
    info.lastModified = std::to_string(st.st_mtime);
    info.contentType = "application/octet-stream";
    info.originalName = key;
    
    std::ifstream mfs(getMetadataPath(key));
    if (mfs) {
        std::string line, content;
        while (std::getline(mfs, line)) content += line;
        size_t pos = content.find("\"originalName\":\"");
        if (pos != std::string::npos) {
            pos += 16;
            size_t end = content.find("\"", pos);
            if (end != std::string::npos) info.originalName = content.substr(pos, end - pos);
        }
        pos = content.find("\"contentType\":\"");
        if (pos != std::string::npos) {
            pos += 14;
            size_t end = content.find("\"", pos);
            if (end != std::string::npos) info.contentType = content.substr(pos, end - pos);
        }
    }
    return true;
}

bool Storage::readFile(const std::string& key, std::string& content) {
    std::string filePath = getFilePath(key);
    std::ifstream ifs(filePath, std::ios::binary);
    if (!ifs) return false;
    
    content.assign((std::istreambuf_iterator<char>(ifs)), std::istreambuf_iterator<char>());
    return true;
}

std::string Storage::getFilePath(const std::string& key) const {
    return filesDir_ + "/" + key;
}

bool Storage::deleteFile(const std::string& key) {
    std::string filePath = getFilePath(key);
    std::string metaPath = getMetadataPath(key);
    
    bool ok = true;
    if (std::remove(filePath.c_str()) != 0) ok = false;
    std::remove(metaPath.c_str());
    
    return ok;
}
