---
title: Traefik + Docker + Vaultwarden
author: devops
date: 2023-05-13 11:00:00 +0300
categories: [Блог, Инструкции]
tags: [devops инструкции docker]
---


# Traefik + Vaultwarden + Docker

До какого-то времени использовал в своих проектах NGINX как proxy-сервер, но решил попробовать Traefik. Да и с Docker он более дружелюбен, чем nginx. Мне нужно было за минимальное время поднять в контейнере - Traefik + Vaultwarden (может быть любой сервис).

## Введение
Приведенные ниже списки описывают среду и версии, которые я использовал для этого поста, и возможные другие требования.

## Требования:

VPS или другой любой сервер с Ubuntu(выбор ОС не принципиален, главное установить Docker)
Почти прямые руки
Traefik
Traefik - это современный и легкий обратный прокси-сервер и балансировщик нагрузки, который упрощает развертывание микросервисов. Он разработан так, чтобы быть максимально простым в управлении, но способным обрабатывать большие и очень сложные развертывания.

Он также поставляется с мощным набором промежуточного программного обеспечения, которое расширяет его возможности, включая балансировку нагрузки, API gateway, вход в orchestrator. Он написан на Go и упакован в виде одного двоичного файла и доступен в виде крошечного официального образа docker.

Традиционные обратные прокси требуют, чтобы вы настроили каждый маршрут, который будет соединять пути и поддомены с каждым микросервисом. В среде, где вы добавляете, удаляете, отключаете, обновляете или масштабируете свои сервисы много раз в день, задача поддержания маршрутов в актуальном состоянии становится утомительной. 😟

Traefik прослушивает ваш сервис registry / orchestrator API и мгновенно генерирует маршруты, чтобы ваши микросервисы были подключены к внешнему миру — без дальнейшего вмешательства с вашей стороны.


## Настройки
Я пропущю некоторые настройки, такие как настройка DNS записей, настройка доменов.

Я заранее подготовил структуру, которая расположена в моем Github.

```
git clone git@github.com:devopsinka/docker-traefik-vaultwarden.git ./src
```

```
.
└── src/
    ├── core/
    │   ├── traefik-data/
    │   │   ├── configurations/
    │   │   │   └── dynamic.yml
    │   │   ├── traefik.yml
    │   │   └── acme.json
    │   └── docker-compose.yml
    └── apps/
```
Немного теории.

traefik.yml Первый файл, который мы рассмотрим, - это traefik.yml файл, как показано во фрагменте кода ниже. Это статическая базовая конфигурация Traefik.

Сначала мы сообщаем Traefik в строке 2, что нам нужен веб-графический интерфейс, установив dashboard:true

После этого мы определяем наши две точки входа web (http) и websecure (https). Для нашей защищенной https конечной точки мы настроили certResolver, чтобы мы могли пользоваться автоматическими сертификатами от Let’s Encrypt! 😄 Далее в строке 16 мы загружаем соответствующее промежуточное программное обеспечение, чтобы весь наш трафик был перенаправлен на https.

В providers части в строке 20 мы указываем, что этот файл будет передан в контейнер docker с помощью bind mount. Мы также просим Traefik найти нашу динамическую конфигурацию в configurations/dynamic.yml. И, наконец, конфигурация для нашего преобразователя SSL-сертификатов.


```
api:
  dashboard: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure

  websecure:
    address: ":443"
    http:
      middlewares:
        - secureHeaders@file
      tls:
        certResolver: letsencrypt

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
  file:
    filename: /configurations/dynamic.yml

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: acme.json
      keyType: EC384
      httpChallenge:
        entryPoint: web
```

Примечание: Обязательно настройте электронную почту в этом файле для обновления Let’s Encrypt. @yourdomain.com может возникнуть ошибка, когда вы захотите запустить свой контейнер docker!

dynamic.yml Этот файл содержит наше промежуточное программное обеспечение, обеспечивающее полную безопасность всего нашего трафика и проходящее по протоколу TLS. Мы также настроили базовую аутентификацию здесь в строках 11-14 для нашей панели мониторинга Traefik, потому что по умолчанию она доступна для всех.

Файл полностью динамичен и может быть отредактирован “на лету”, без перезапуска нашего контейнера.

```
# Dynamic configuration
http:
  middlewares:
    secureHeaders:
      headers:
        sslRedirect: true
        forceSTSHeader: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000
    user-auth:
      basicAuth:
        users:
          - "raf:$apr1$MTqfVwiE$FKkzT5ERGFqwH9f3uipxA1"

tls:
  options:
    default:
      cipherSuites:
        - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
        - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
      minVersion: VersionTLS12
```
Как можно увидеть из кода выше, у нас есть зашифрованная строка. Это зашифрованная строка, которая содержит в себе username и пароль от dashboard traefik. Для того, чтобы сгенерировать логин и пароль. Необходимо установить в систему пакет

sudo apt install apache2-utils

И после этого выполнить:

echo $(htpasswd -nb <username> <password>)

Полученное значение вставить в basicAuth

docker-compose.yml Самый важный файл. Именно здесь происходит вся магия. Прелесть Traefik в том, что после первоначальной настройки развертывание новых контейнеров становится очень простым. Это работает путем указания labels для ваших контейнеров.

```
version: "3.8"

services:
  traefik:
    image: "traefik:latest"
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - "no-new-privileges:true"
    networks:
      - proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/etc/localtime:/etc/localtime:ro"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./traefik-data/traefik.yml:/traefik.yml:ro"
      - "./traefik-data/acme.json:/acme.json"
      - "./traefik-data/configurations:/configurations"
    labels:
      - traefik.enable=true
      - traefik.docker.network=proxy
      - traefik.http.routers.traefik-secure.entrypoints=websecure
      - traefik.http.routers.traefik-secure.rule=Host(`traefik.example.com`)
      - traefik.http.routers.traefik-secure.service=api@internal
      - traefik.http.routers.traefik-secure.middlewares=user-auth@file


  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: always
    environment:
      - WEBSOCKET_ENABLED=true
      - SIGNUPS_ALLOWED=false
    volumes:
      - ./vw-data:/data
    labels:
      - traefik.enable=true
      - traefik.docker.network=proxy
      - traefik.http.routers.fastapi.entrypoints=websecure
      - traefik.http.routers.fastapi.rule=Host(`vault.example.com`)
    networks:
      - proxy

networks:
  proxy:
    external: true
```

Для каждого контейнера, который вы хотите, чтобы Traefik обрабатывал, вы добавляете метки, чтобы Traefik знал, куда его следует направить. Итак, когда мы посмотрим на файл выше, давайте быстро проверим, что происходит в traefik контейнере.

Итак, мы прикрепляем первую метку в строке 22, которая сообщает Traefik, что он должен перенаправить этот контейнер, потому что мы указываем enable=true. Это результат настройки в статическом traefik.yml файле, где мы явно указали exposedByDefault: false, поэтому мы должны указать это.

Вторая метка в строке 23 сообщает нам, что мы должны использовать сеть proxy, которую мы создадим позже. После этого мы говорим Traefik использовать нашу websecure конечную точку (https). Затем мы указываем имя нашего хоста с соответствующим доменом в строке 25. 👍

Метка от последней до последней указывает обработчик API. Оно предоставляет такую информацию, как конфигурация всех маршрутизаторов, служб, промежуточного программного обеспечения и т.д. Чтобы просмотреть все доступные конечные точки, вы можете ознакомиться с документами.

Самая последняя метка в строке 27 - это наше базовое промежуточное программное обеспечение для аутентификации, помните? Поскольку панель мониторинга Traefik доступна по умолчанию, мы добавляем к ней базовый уровень безопасности. Это также защитит наш API.

Создание прокси-сети

Нам нужно создать новую сеть Docker, которая будет пропускать внешний трафик. Это должно вызываться proxy так, как мы указали в нашем docker-compose.yml файле:

```
networks:
  - proxy
```

Чтобы создать сеть docker, используйте:

```
sudo docker network create proxy
```


Предоставление надлежащих разрешений для acme.json По умолчанию для файла acme.json установлено разрешение 644, это приведет к ошибке при запуске docker-compose. Поэтому убедитесь, что вы установили разрешения для этого конкретного файла на 600. cd войдите в core папку и запустите следующую команду:

```
sudo chmod 600 ./traefik-data/acme.json
```


Запуск стека Теперь пришло время запустить стек. Убедитесь, что вы находитесь в core папке, чтобы docker мог найти файл docker-compose. При первом запуске мне всегда нравится проверять процесс на наличие ошибок, прежде чем мы используем флаг docker compose –detach. Выполните следующую команду:

sudo docker compose down && sudo docker compose up -d
DONE!