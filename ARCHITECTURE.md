# 🏗️ Архитектура проекта S3 Storage Application

## Общая архитектура системы

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React Frontend<br/>localhost:3000]
    end
    
    subgraph "API Layer"
        API[Express.js Server<br/>localhost:5000]
        Routes[API Routes]
    end
    
    subgraph "Storage Layer"
        LocalStorage[Local File Storage<br/>storage/files/]
        S3Storage[AWS S3 Storage<br/>Optional]
    end
    
    subgraph "Configuration"
        Config[Environment Config<br/>.env]
        Mode{Storage Mode}
    end
    
    UI -->|HTTP Requests| API
    API --> Routes
    Routes -->|File Operations| Mode
    Mode -->|USE_LOCAL_STORAGE=true| LocalStorage
    Mode -->|USE_LOCAL_STORAGE=false| S3Storage
    Config --> Mode
    
    style UI fill:#667eea,stroke:#333,stroke-width:2px,color:#fff
    style API fill:#764ba2,stroke:#333,stroke-width:2px,color:#fff
    style LocalStorage fill:#4caf50,stroke:#333,stroke-width:2px,color:#fff
    style S3Storage fill:#ff9800,stroke:#333,stroke-width:2px,color:#fff
```

## Детальная архитектура API

```mermaid
graph LR
    subgraph "Frontend Components"
        App[App.js<br/>Main Component]
        Upload[FileUpload<br/>Component]
        List[FileList<br/>Component]
        API_Client[API Service<br/>api.js]
    end
    
    subgraph "Backend API Routes"
        UploadRoute[POST /api/storage/upload]
        UploadMultiRoute[POST /api/storage/upload-multiple]
        ListRoute[GET /api/storage/files]
        DownloadRoute[GET /api/storage/download/:key]
        PreviewRoute[GET /api/storage/preview/:key]
        DeleteRoute[DELETE /api/storage/files/:key]
        DeleteMultiRoute[DELETE /api/storage/files]
    end
    
    subgraph "Storage Handlers"
        LocalHandler[Local Storage Handler<br/>localStorage.js]
        S3Handler[S3 Handler<br/>s3.js]
    end
    
    subgraph "File System"
        FileSystem[File System<br/>storage/files/]
        Metadata[Metadata Storage<br/>storage/metadata/]
    end
    
    App --> Upload
    App --> List
    Upload --> API_Client
    List --> API_Client
    
    API_Client -->|POST| UploadRoute
    API_Client -->|POST| UploadMultiRoute
    API_Client -->|GET| ListRoute
    API_Client -->|GET| DownloadRoute
    API_Client -->|GET| PreviewRoute
    API_Client -->|DELETE| DeleteRoute
    API_Client -->|DELETE| DeleteMultiRoute
    
    UploadRoute --> LocalHandler
    UploadMultiRoute --> LocalHandler
    ListRoute --> LocalHandler
    DownloadRoute --> LocalHandler
    PreviewRoute --> LocalHandler
    DeleteRoute --> LocalHandler
    DeleteMultiRoute --> LocalHandler
    
    LocalHandler --> FileSystem
    LocalHandler --> Metadata
    
    style App fill:#667eea,stroke:#333,stroke-width:2px,color:#fff
    style API_Client fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    style LocalHandler fill:#4caf50,stroke:#333,stroke-width:2px,color:#fff
```

## Поток данных при загрузке файла

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Storage
    participant FileSystem
    
    User->>Frontend: Drag & Drop / Select File
    Frontend->>Frontend: Create FormData
    Frontend->>API: POST /api/storage/upload
    API->>API: Validate Request
    API->>Storage: Save File
    Storage->>FileSystem: Write File
    Storage->>Storage: Save Metadata
    FileSystem-->>Storage: File Saved
    Storage-->>API: Success Response
    API-->>Frontend: JSON Response
    Frontend->>Frontend: Update UI
    Frontend-->>User: Show Success Message
```

## Поток данных при получении списка файлов

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Storage
    participant FileSystem
    
    User->>Frontend: Open App / Click Refresh
    Frontend->>API: GET /api/storage/files
    API->>Storage: listFiles()
    Storage->>FileSystem: Read Directory
    FileSystem-->>Storage: File List
    Storage->>Storage: Read Metadata
    Storage->>Storage: Combine Data
    Storage-->>API: Files Array
    API-->>Frontend: JSON Response
    Frontend->>Frontend: Update State
    Frontend-->>User: Display File List
```

## Структура модулей

```mermaid
graph TD
    subgraph "Server Structure"
        Server[server/index.js<br/>Main Server]
        Config[server/config/]
        Routes[server/routes/]
        
        Config --> LocalConfig[localStorage.js<br/>Local Storage Config]
        Config --> S3Config[s3.js<br/>AWS S3 Config]
        
        Routes --> LocalRoutes[localStorage.js<br/>Local Storage Routes]
        Routes --> S3Routes[s3.js<br/>S3 Routes]
    end
    
    subgraph "Client Structure"
        Client[client/src/]
        Components[components/]
        Services[services/]
        
        Components --> App[App.js]
        Components --> Upload[FileUpload.js]
        Components --> List[FileList.js]
        Components --> Warning[AwsConfigWarning.js]
        
        Services --> API[api.js<br/>API Client]
    end
    
    Server --> Config
    Server --> Routes
    Client --> Components
    Client --> Services
    
    style Server fill:#764ba2,stroke:#333,stroke-width:2px,color:#fff
    style Client fill:#667eea,stroke:#333,stroke-width:2px,color:#fff
```

## API Endpoints Architecture

```mermaid
graph TB
    subgraph "API Endpoints"
        Upload[POST /api/storage/upload<br/>Single File Upload]
        UploadMulti[POST /api/storage/upload-multiple<br/>Multiple Files Upload]
        List[GET /api/storage/files<br/>List All Files]
        Details[GET /api/storage/files/:key<br/>Get File Details]
        Download[GET /api/storage/download/:key<br/>Download File]
        Preview[GET /api/storage/preview/:key<br/>Get Preview URL]
        View[GET /api/storage/files/:key/view<br/>View File]
        Delete[DELETE /api/storage/files/:key<br/>Delete Single File]
        DeleteMulti[DELETE /api/storage/files<br/>Delete Multiple Files]
    end
    
    subgraph "Storage Operations"
        Save[Save File]
        Read[Read File]
        ListFiles[List Files]
        DeleteFile[Delete File]
        Metadata[Manage Metadata]
    end
    
    Upload --> Save
    UploadMulti --> Save
    List --> ListFiles
    Details --> Read
    Download --> Read
    Preview --> Read
    View --> Read
    Delete --> DeleteFile
    DeleteMulti --> DeleteFile
    
    Save --> Metadata
    Read --> Metadata
    DeleteFile --> Metadata
    
    style Upload fill:#4caf50,stroke:#333,stroke-width:2px,color:#fff
    style List fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    style Delete fill:#f44336,stroke:#333,stroke-width:2px,color:#fff
```

## Технологический стек

```mermaid
graph LR
    subgraph "Frontend Stack"
        React[React 18]
        Axios[Axios]
        CSS[CSS3]
    end
    
    subgraph "Backend Stack"
        Express[Express.js]
        Multer[Multer]
        NodeFS[Node.js FS]
        DotEnv[DotEnv]
    end
    
    subgraph "Storage Options"
        LocalFS[Local File System]
        AWSS3[AWS S3 SDK]
    end
    
    React --> Axios
    Axios --> Express
    Express --> Multer
    Multer --> LocalFS
    Multer --> AWSS3
    Express --> NodeFS
    
    style React fill:#61dafb,stroke:#333,stroke-width:2px
    style Express fill:#000,stroke:#333,stroke-width:2px,color:#fff
    style LocalFS fill:#4caf50,stroke:#333,stroke-width:2px,color:#fff
```

## Режимы работы системы

```mermaid
stateDiagram-v2
    [*] --> CheckConfig: Application Start
    
    CheckConfig --> LocalMode: USE_LOCAL_STORAGE=true
    CheckConfig --> S3Mode: USE_LOCAL_STORAGE=false
    
    LocalMode --> LocalStorage: Initialize
    S3Mode --> CheckCredentials: Check AWS Credentials
    
    CheckCredentials --> S3Storage: Valid Credentials
    CheckCredentials --> Error: Invalid Credentials
    
    LocalStorage --> Ready: Storage Ready
    S3Storage --> Ready: Storage Ready
    Error --> [*]
    
    Ready --> HandleRequest: API Request
    HandleRequest --> Ready: Response Sent
    
    note right of LocalMode
        Files stored in:
        storage/files/
        storage/metadata/
    end note
    
    note right of S3Mode
        Files stored in:
        AWS S3 Bucket
    end note
```

## Безопасность и обработка ошибок

```mermaid
graph TB
    Request[API Request] --> Validate{Validate Request}
    Validate -->|Invalid| Error400[400 Bad Request]
    Validate -->|Valid| Auth{Check Auth}
    
    Auth -->|Local Mode| Process[Process Request]
    Auth -->|S3 Mode| CheckCreds{Check AWS Creds}
    
    CheckCreds -->|Invalid| Error403[403 Forbidden]
    CheckCreds -->|Valid| Process
    
    Process --> StorageOp[Storage Operation]
    StorageOp -->|Success| Success[200 OK]
    StorageOp -->|File Not Found| Error404[404 Not Found]
    StorageOp -->|Storage Error| Error500[500 Server Error]
    
    Error400 --> Response[Error Response]
    Error403 --> Response
    Error404 --> Response
    Error500 --> Response
    Success --> Response
    
    Response --> Client[Client Response]
    
    style Error400 fill:#ff9800,stroke:#333,stroke-width:2px,color:#fff
    style Error403 fill:#f44336,stroke:#333,stroke-width:2px,color:#fff
    style Error404 fill:#9e9e9e,stroke:#333,stroke-width:2px,color:#fff
    style Error500 fill:#f44336,stroke:#333,stroke-width:2px,color:#fff
    style Success fill:#4caf50,stroke:#333,stroke-width:2px,color:#fff
```

## Компоненты фронтенда

```mermaid
graph TD
    App[App Component] --> Upload[FileUpload Component]
    App --> List[FileList Component]
    App --> Warning[AwsConfigWarning Component]
    
    Upload --> API[API Service]
    List --> API
    
    Upload -->|onUploadSuccess| App
    List -->|onDelete| App
    List -->|onRefresh| App
    
    API -->|HTTP Requests| Backend[Express Backend]
    
    subgraph "FileUpload Features"
        DragDrop[Drag & Drop]
        MultipleFiles[Multiple Upload]
        Progress[Upload Progress]
    end
    
    subgraph "FileList Features"
        FileTable[File Table]
        Selection[Multi Selection]
        Actions[Download/Preview/Delete]
    end
    
    Upload --> DragDrop
    Upload --> MultipleFiles
    Upload --> Progress
    
    List --> FileTable
    List --> Selection
    List --> Actions
    
    style App fill:#667eea,stroke:#333,stroke-width:2px,color:#fff
    style API fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
```

## Схема хранения данных

```mermaid
graph LR
    subgraph "File Storage"
        Files[storage/files/<br/>Actual Files]
    end
    
    subgraph "Metadata Storage"
        Metadata[storage/metadata/<br/>JSON Files]
    end
    
    subgraph "Metadata Structure"
        MetaData{JSON Object}
        MetaData --> OriginalName[originalName]
        MetaData --> ContentType[contentType]
        MetaData --> Size[size]
        MetaData --> UploadedAt[uploadedAt]
    end
    
    Files -.->|Linked by filename| Metadata
    
    style Files fill:#4caf50,stroke:#333,stroke-width:2px,color:#fff
    style Metadata fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
```

## Полная архитектура системы

```mermaid
graph TB
    subgraph "User Interface"
        Browser[Web Browser]
        UI[React UI Components]
    end
    
    subgraph "Application Layer"
        Frontend[React Frontend<br/>Port 3000]
        Backend[Express Backend<br/>Port 5000]
    end
    
    subgraph "API Layer"
        REST[REST API Endpoints]
        Middleware[CORS, JSON Parser]
    end
    
    subgraph "Business Logic"
        Routes[Route Handlers]
        Validators[Request Validators]
        StorageLogic[Storage Logic]
    end
    
    subgraph "Data Layer"
        LocalStorage[Local File Storage]
        S3Storage[AWS S3 Storage]
        MetadataDB[Metadata Storage]
    end
    
    subgraph "Configuration"
        EnvConfig[.env Configuration]
        StorageMode{Storage Mode Selector}
    end
    
    Browser --> UI
    UI --> Frontend
    Frontend -->|HTTP| Backend
    Backend --> Middleware
    Middleware --> REST
    REST --> Routes
    Routes --> Validators
    Validators --> StorageLogic
    StorageLogic --> StorageMode
    StorageMode -->|Local| LocalStorage
    StorageMode -->|S3| S3Storage
    StorageLogic --> MetadataDB
    EnvConfig --> StorageMode
    
    style Frontend fill:#667eea,stroke:#333,stroke-width:3px,color:#fff
    style Backend fill:#764ba2,stroke:#333,stroke-width:3px,color:#fff
    style LocalStorage fill:#4caf50,stroke:#333,stroke-width:3px,color:#fff
    style S3Storage fill:#ff9800,stroke:#333,stroke-width:3px,color:#fff
```

---

## Описание компонентов

### Frontend (React)
- **App.js** - Главный компонент, управляет состоянием
- **FileUpload.js** - Компонент загрузки файлов с drag & drop
- **FileList.js** - Компонент отображения списка файлов
- **api.js** - Клиент для взаимодействия с API

### Backend (Express.js)
- **server/index.js** - Главный файл сервера
- **server/routes/localStorage.js** - Роуты для локального хранилища
- **server/routes/s3.js** - Роуты для AWS S3 (опционально)
- **server/config/localStorage.js** - Конфигурация локального хранилища
- **server/config/s3.js** - Конфигурация AWS S3

### Storage
- **Local Storage** - Файлы в `storage/files/`, метаданные в `storage/metadata/`
- **AWS S3** - Облачное хранилище (опционально)

### Configuration
- **.env** - Конфигурация приложения
- **USE_LOCAL_STORAGE** - Переключатель режима работы
