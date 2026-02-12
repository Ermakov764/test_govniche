#pragma once

#include <string>
#include <vector>
#include <chrono>

struct FileInfo {
    std::string key;
    size_t size = 0;
    std::string lastModified;
    std::string contentType;
    std::string originalName;
};

class Storage {
public:
    Storage();
    bool init();
    
    std::string saveFile(const std::string& filename, const std::string& content, 
                         const std::string& contentType, size_t size);
    bool saveMetadata(const std::string& key, const std::string& originalName,
                      const std::string& contentType, size_t size);
    
    std::vector<FileInfo> listFiles();
    bool getFileInfo(const std::string& key, FileInfo& info);
    
    bool readFile(const std::string& key, std::string& content);
    std::string getFilePath(const std::string& key) const;
    
    bool deleteFile(const std::string& key);

private:
    std::string storageDir_;
    std::string filesDir_;
    std::string metadataDir_;
    
    std::string getMetadataPath(const std::string& key) const;
};
