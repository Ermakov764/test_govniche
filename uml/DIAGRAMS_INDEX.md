# 📊 Индекс UML диаграмм

Все диаграммы доступны в двух форматах:
- **PNG** - готовые изображения для просмотра
- **PlantUML** - исходные файлы для редактирования

## Диаграммы

### 1. Диаграмма классов
- **PNG**: [class-diagram.png](class-diagram.png)
- **Source**: [class-diagram.puml](class-diagram.puml)
- **Описание**: Показывает структуру классов приложения, их атрибуты, методы и взаимосвязи между Frontend и Backend компонентами.

### 2. Последовательность загрузки
- **PNG**: [sequence-upload.png](sequence-upload.png)
- **Source**: [sequence-upload.puml](sequence-upload.puml)
- **Описание**: Детально показывает взаимодействие компонентов при загрузке файла от пользователя до сохранения в хранилище.

### 3. Последовательность получения списка файлов
- **PNG**: [sequence-list.png](sequence-list.png)
- **Source**: [sequence-list.puml](sequence-list.puml)
- **Описание**: Процесс получения списка файлов из хранилища и отображения их пользователю.

### 4. Последовательность скачивания
- **PNG**: [sequence-download.png](sequence-download.png)
- **Source**: [sequence-download.puml](sequence-download.puml)
- **Описание**: Процесс скачивания файла пользователем, включая обработку ошибок.

### 5. Диаграмма компонентов
- **PNG**: [component-diagram.png](component-diagram.png)
- **Source**: [component-diagram.puml](component-diagram.puml)
- **Описание**: Архитектура компонентов системы и их взаимосвязи на высоком уровне.

### 6. Диаграмма активности
- **PNG**: [activity-diagram.png](activity-diagram.png)
- **Source**: [activity-diagram.puml](activity-diagram.puml)
- **Описание**: Бизнес-процесс загрузки файла с ветвлениями и условиями.

### 7. Диаграмма состояний
- **PNG**: [state-diagram.png](state-diagram.png)
- **Source**: [state-diagram.puml](state-diagram.puml)
- **Описание**: Состояния приложения и переходы между ними, включая режимы работы (локальное хранилище / AWS S3).

### 8. Диаграмма развертывания
- **PNG**: [deployment-diagram.png](deployment-diagram.png)
- **Source**: [deployment-diagram.puml](deployment-diagram.puml)
- **Описание**: Физическое развертывание компонентов системы, включая локальное хранилище и AWS S3.

### 9. Диаграмма прецедентов
- **PNG**: [usecase-diagram.png](usecase-diagram.png)
- **Source**: [usecase-diagram.puml](usecase-diagram.puml)
- **Описание**: Функциональные требования системы с точки зрения пользователя - все доступные операции.

## Быстрый доступ

### Все PNG файлы
- [activity-diagram.png](activity-diagram.png)
- [class-diagram.png](class-diagram.png)
- [component-diagram.png](component-diagram.png)
- [deployment-diagram.png](deployment-diagram.png)
- [sequence-download.png](sequence-download.png)
- [sequence-list.png](sequence-list.png)
- [sequence-upload.png](sequence-upload.png)
- [state-diagram.png](state-diagram.png)
- [usecase-diagram.png](usecase-diagram.png)

### Все PlantUML исходники
- [activity-diagram.puml](activity-diagram.puml)
- [class-diagram.puml](class-diagram.puml)
- [component-diagram.puml](component-diagram.puml)
- [deployment-diagram.puml](deployment-diagram.puml)
- [sequence-download.puml](sequence-download.puml)
- [sequence-list.puml](sequence-list.puml)
- [sequence-upload.puml](sequence-upload.puml)
- [state-diagram.puml](state-diagram.puml)
- [usecase-diagram.puml](usecase-diagram.puml)

## Регенерация PNG

Если нужно обновить PNG изображения после изменения .puml файлов:

```bash
cd uml
./generate-png.sh
```
