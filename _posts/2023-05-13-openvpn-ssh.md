---
title: OpenVPN + SSH
date: 2023-05-13 11:00:00 +0300
categories: [Блог, Инструкции]
tags: [Linux, vpn, ssh]
pin: false 
math: true
mermaid: true
---

# Как прокинуть трафик из VPS на свой сервер ?

В этой статье пойдет речь о том, как настроить доступ до своего ПК, не имея белого адреса. Можно воспользоваться покупкой белого адреса у провайдера, но для меня, честно, это дорого. Мой провайдер хочет взять за покупку 500р + 200р в месяц за аренду. Это кощунство в чистом виде. Давай приступать к настройке.

Я не буду рассказывать о том, где купить VPS, как настроить доступ к серверу по SSH. Раз вы задумались над тем, как “пробить” доступ до своего компа, вы уже должны знать о таких вещах “как войти по ssh”

Заходим по SSH на VPS.

Обновляем пакеты:

```
sudo apt-get update
```

Ставим дополнительные пакеты.
```
sudo apt-get install -y make build-essential git libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev
```

Дополнительно я ставлю менеджер пакетов
```
curl -L https://raw.githubusercontent.com/pyenv/pyenv-installer/master/bin/pyenv-installer | bash
```
Далее ставим openvpn. Скрипт автоматически все сам сделает, достаточно только прожать несколько пунктов.

```
wget https://git.io/vpn -O openvpn-install.sh && bash openvpn-install.sh
```

После установки проверяем через ifconfig, что у нас появился новый сетевой интерфейс. У меня это tun0, с адресом 10.8…. И openvpn сформирует .ovpn сертификат. Копируем данный сертификат к себе на локальный комп, а уже после кладем в наш локальный сервер, но если вы работаете с локального сервера, то вам достаточно сделать команду scp -r один раз.

Разрешаем переадресацию портов
```
sudo echo 1 > /proc/sys/net/ipv4/ip_forward
```
Открываем файл /etc/sysctl.conf
```
sudo nano /etc/sysctl.conf
```
Добавляем в конец файла следующие параметры:
```
net.ipv4.conf.default.forwarding=1
net.ipv4.conf.all.forwarding=1
```
Сохраняем и закрывем

Добавляем правила в iptables
```
sudo iptables -A INPUT -i tun+ -j ACCEPT
sudo iptables -A FORWARD -i tun+ -j ACCEPT
sudo iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo iptables -t nat -F POSTROUTING
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o [Имя сет. интерфейса этого сервера] -j MASQUERADE
```
Добавляем правило для переадресации портов

```
sudo iptables -t nat -A PREROUTING -d [IP Адрес промежуточного сервера] -p tcp --dport [Порт промежуточного сервера, в нашем случае 2244] -j DNAT --to-dest 10.8.0.6:[Порт клиентского сервера, в нашем случае 80]
```
Для того чтобы правила вступили в силу.
```
sudo iptables-save
```
Сохраним правила в конфиг файл для подгрузки при перезагрузке.
```
sudo iptables-save > /etc/iptables.conf
```
Создаем скрипт применения правил при перезагрузке
```
sudo nano /etc/network/if-up.d/rules_ipv4
```
Добавляем следующее:
```
#!/bin/bash
iptables-restore /etc/iptables.conf
```
Делаем этот файл исполняемым
```
sudo chmod +x /etc/network/if-up.d/rules_ipv4
```
Наш ПК (клиентский сервер)
Устанавливаем OpenVPN сервер
```
sudo apt install openvpn
```
После этого копируем наш сертификат с VPS в /etc/openvpn/client.conf

Далее пишем такую команду
```
openvpn --client --config /etc/openvpn/client.conf
```
Нам отображается лог файл с подключением. Давайте запустим эту команду в фоне.
```
openvpn --client --config /etc/openvpn/client.conf &
```
После этого можем вводить другие команды в терминале. Проверим наш интерфейс. Должен появится интерфейс с адресом 10.8….
```
ip a 
```
Теперь сделаем так, что бы у нас автоматически стартовал openvpn клиент.
```
systemctl enable openvpn-client@.service
```
Для проверки “грохнем” vpn и затем введем:
```
service openvpn@client start
```
Ппроверим как работает ssh подключение к нашему локальному серверу через боевой сервер.
```
ssh username@[IP_АДРЕС_VPS] -p 2244
```
Если успешно авторизовались, то поздравляю, вы все настроили верно.
