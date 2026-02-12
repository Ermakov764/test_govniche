cmake_minimum_required(VERSION 3.14)
project(storage_api LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)

# cpp-httplib (header-only)
include(FetchContent)
FetchContent_Declare(
    httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG v0.15.3
)
FetchContent_MakeAvailable(httplib)

# nlohmann/json (header-only)
FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
)
FetchContent_MakeAvailable(nlohmann_json)

# Increase payload limit for file uploads (100MB)
add_compile_definitions(CPPHTTPLIB_PAYLOAD_MAX_LENGTH=104857600)

add_executable(storage_server
    src/main.cpp
    src/storage.cpp
)

target_include_directories(storage_server PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${httplib_SOURCE_DIR}
    ${nlohmann_json_SOURCE_DIR}/include
)

target_link_libraries(storage_server PRIVATE
    pthread
)

# Copy httplib to include if FetchContent doesn't set it
if(NOT TARGET httplib)
    add_library(httplib INTERFACE)
    target_include_directories(httplib INTERFACE ${httplib_SOURCE_DIR})
endif()
