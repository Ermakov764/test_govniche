import React from 'react';
import './AwsConfigWarning.css';

const AwsConfigWarning = () => {
  return (
    <div className="aws-config-warning">
      <div className="warning-icon">⚠️</div>
      <div className="warning-content">
        <h3>AWS Credentials не настроены</h3>
        <p>Для работы приложения необходимо настроить AWS S3 credentials.</p>
        <div className="instructions">
          <h4>📖 Пошаговая инструкция (для начинающих):</h4>
          
          <div className="step">
            <h5>ШАГ 1: Создайте аккаунт AWS (если его нет)</h5>
            <p>Перейдите на <a href="https://aws.amazon.com" target="_blank" rel="noopener noreferrer">aws.amazon.com</a> и создайте бесплатный аккаунт (есть бесплатный уровень на 12 месяцев)</p>
          </div>

          <div className="step">
            <h5>ШАГ 2: Создайте IAM пользователя и получите ключи</h5>
            <ol>
              <li>Войдите в <a href="https://console.aws.amazon.com" target="_blank" rel="noopener noreferrer">AWS Console</a></li>
              <li>В поиске введите <strong>"IAM"</strong> и откройте сервис</li>
              <li>Нажмите <strong>"Users"</strong> → <strong>"Create user"</strong></li>
              <li>Введите имя (например: <code>s3-storage-user</code>)</li>
              <li>Прикрепите политику <strong>"AmazonS3FullAccess"</strong></li>
              <li>Создайте пользователя</li>
              <li><strong>ВАЖНО:</strong> Нажмите <strong>"Create access key"</strong></li>
              <li>Выберите <strong>"Application running outside AWS"</strong></li>
              <li><strong>СОХРАНИТЕ ОБА КЛЮЧА:</strong>
                <ul>
                  <li><code>Access key ID</code> - это как логин</li>
                  <li><code>Secret access key</code> - это как пароль (показывается только 1 раз!)</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="step">
            <h5>ШАГ 3: Создайте S3 Bucket (ведро для файлов)</h5>
            <ol>
              <li>В AWS Console найдите <strong>"S3"</strong></li>
              <li>Нажмите <strong>"Create bucket"</strong></li>
              <li>Введите уникальное имя (например: <code>my-storage-2026</code>)</li>
              <li>Выберите регион (например: <code>us-east-1</code>)</li>
              <li>Запомните имя bucket и регион!</li>
              <li>Нажмите <strong>"Create bucket"</strong></li>
            </ol>
          </div>

          <div className="step">
            <h5>ШАГ 4: Настройте файл .env</h5>
            <p>Откройте файл <code>.env</code> в корне проекта и замените значения:</p>
            <div className="example-config">
              <strong>Пример (замените на ваши реальные значения):</strong>
              <pre>
{`AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=my-storage-2026`}
              </pre>
              <p className="hint">
                <strong>Где что брать:</strong><br/>
                • <code>AWS_ACCESS_KEY_ID</code> - Access key ID из шага 2<br/>
                • <code>AWS_SECRET_ACCESS_KEY</code> - Secret access key из шага 2<br/>
                • <code>AWS_REGION</code> - регион из шага 3 (например: us-east-1)<br/>
                • <code>AWS_S3_BUCKET_NAME</code> - имя bucket из шага 3
              </p>
            </div>
          </div>

          <div className="step">
            <h5>ШАГ 5: Сохраните и перезапустите</h5>
            <p>Сохраните файл .env - сервер перезапустится автоматически. Обновите страницу в браузере.</p>
          </div>

          <p className="note">
            <strong>💡 Подсказка:</strong> Подробная инструкция с картинками находится в файле <code>AWS_SETUP_GUIDE.md</code> в корне проекта.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AwsConfigWarning;
