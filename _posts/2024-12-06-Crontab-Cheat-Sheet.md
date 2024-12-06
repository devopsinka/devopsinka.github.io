---
title: Crontab Cheat Sheet - Практический гайд с примерами
date: 2023-06-11 10:14:00 +8000
categories: [Блог, Инструкции]
tags: [Linux, Cli, Crontab]
pin: false
math: true
mermaid: true
image: 
  path: https://ik.imagekit.io/11medxjtac/Crontab%20Cheat%20Sheet.webp?updatedAt=1733477212625
  alt: crontab 
---


## Введение

Crontab - это мощная утилита для Unix-подобных операционных систем, которая позволяет планировать и автоматизировать задачи с заранее определенными интервалами. Она использует демон cron для выполнения команд или сценариев в соответствии с заданным расписанием. Эта шпаргалка содержит обзор синтаксиса crontab и демонстрирует практические примеры, которые помогут вам эффективно планировать повторяющиеся задачи.

Table of Contents

- [Введение](#introduction)
- [Разница между Cron, Crontab и Cron Job](#difference-between-cron-crontab-and-cron-job)
  - [Cron](#cron)
  - [Crontab](#crontab)
  - [Cron Job](#cron-job)
- [Crontab Синтаксис](#crontab-syntax)
- [Практические примеры](#practical-examples)
  - [Пример 1: Запуск сценария каждый час](#example-1-running-a-script-every-hour)
  - [Пример 2: Запуска сценария каждый день в определенное время](#example-2-running-a-script-every-day-at-a-specific-time)
  - [Пример 3: Запуска сценария в определенные дни недели](#example-3-running-a-script-on-specific-days-of-the-week)
  - [Пример 4: Запуска сценария каждый месяц](#example-4-running-a-script-every-month)
  - [Пример 5: Запуска сценария сценарияс регулярными интервалами,](#example-5-running-a-script-at-regular-intervals)
- [Управление записями в Crontab](#managing-crontab-entries)
- [Вывод](#conclusion)
- [Ресурсы](#resource)
