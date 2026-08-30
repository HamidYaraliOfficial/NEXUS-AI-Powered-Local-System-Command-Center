# NEXUS — AI-Powered Local System Command Center

<p align="center">
  <strong>English</strong> · <a href="#فارسی">فارسی</a> · <a href="#中文">中文</a>
</p>

---

## English

### Overview
NEXUS is a next-generation, local-first desktop command center for monitoring and
controlling your computer. The core (system telemetry, process management, file
operations, storage analysis, networking, terminal execution, security logging,
and the AI tool-router) is implemented in **Rust**. The interface is built with
**Tauri 2 + React + TypeScript**, styled as a modern glassmorphic, dark-premium
control panel with Windows 11–inspired themes.

### Features
- Real-time Overview dashboard (CPU, RAM, disks, uptime, health score) — no mock data
- Advanced Process Manager (search, sort, terminate with confirmation)
- Advanced File Explorer (browse, delete, rename, copy/move, hashing)
- Storage Analyzer (breakdown by file type, largest files, duplicate detection)
- Network Center (interfaces, traffic counters, local subnet device scan)
- Built-in multi-session Terminal with sensitive-command confirmation
- Local, tool-based AI Assistant (keyword-routed to real Rust tools; swappable
  for a local/remote LLM later without changing the tool contracts)
- Command Palette (`Ctrl+K`)
- Security Center & Activity Timeline (SQLite-backed, append-only)
- Services / Startup / Plugins panels
- Full Settings: theme, language, and user-configurable **Availability Hours**
  (open/close time, active days, live "open now" / "next opening in ..." status)
- Five themes: Windows 11 Dark, Windows 11 Light, Windows Default, Crimson (red),
  Azure (blue)
- Full English / Persian (فارسی) / Chinese (中文) localization with correct
  RTL (Persian) and LTR (English, Chinese) layout switching

### Project Structure
```
nexus/
├── src-tauri/            Rust backend (Tauri 2)
│   ├── src/
│   │   ├── main.rs
│   │   ├── db.rs
│   │   └── commands/      system, processes, files, network, terminal, ai, security, settings
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                   React + TypeScript frontend
│   ├── components/
│   ├── i18n/               en.json / fa.json / zh.json
│   ├── store/
│   └── styles/
├── package.json
└── vite.config.ts
```

### Requirements
- Node.js 18+ and npm
- Rust (stable toolchain) via rustup
- Tauri 2 CLI prerequisites for Windows: Microsoft C++ Build Tools + WebView2
  (see the official Tauri prerequisites guide for your OS)

### Install dependencies
```
npm install
```
```
cargo install tauri-cli --version "^2.0.0"
```

### Run in development
```
npm run tauri dev
```

### Build a production Windows installer (.msi / .exe)
```
npm run tauri build
```
The generated installer will be placed under `src-tauri/target/release/bundle/`.

### Notes
- All system data is read live from the machine via `sysinfo` and standard OS
  APIs — nothing is mocked or hard-coded.
- Any AI or terminal action with a side effect (deleting a file, killing a
  process, running a flagged command) always shows a confirmation dialog
  before it executes.
- Settings and logs are stored locally in a bundled SQLite database — nothing
  is sent off the machine.

---

## فارسی

### معرفی
نکسوس یک مرکز فرماندهی دسکتاپ نسل جدید و کاملاً محلی برای نظارت و کنترل کامپیوتر
شماست. هسته اصلی (اطلاعات سیستم، مدیریت پردازش‌ها، عملیات فایل، تحلیل فضای
ذخیره‌سازی، شبکه، اجرای ترمینال، ثبت رویدادهای امنیتی و مسیریاب ابزارهای هوش
مصنوعی) با **Rust** پیاده‌سازی شده است. رابط کاربری با **Tauri 2 + React +
TypeScript** ساخته شده و طراحی آن ترکیبی مدرن از شیشه‌ای (Glassmorphism) و
پوسته‌های الهام‌گرفته از ویندوز ۱۱ است.

### قابلیت‌ها
- داشبورد نمای کلی به‌صورت Real-Time (پردازنده، حافظه، دیسک‌ها، مدت روشن بودن،
  امتیاز سلامت سیستم) — بدون داده ساختگی
- مدیر پیشرفته پردازش‌ها (جستجو، مرتب‌سازی، پایان دادن با تأیید کاربر)
- فایل‌یاب پیشرفته (مرور، حذف، تغییر نام، کپی/انتقال، هش فایل)
- تحلیل‌گر فضای ذخیره‌سازی (تفکیک بر اساس نوع فایل، بزرگ‌ترین فایل‌ها، یافتن
  فایل‌های تکراری)
- مرکز شبکه (رابط‌های شبکه، شمارنده ترافیک، اسکن دستگاه‌های شبکه محلی)
- ترمینال داخلی چند‌نشستی با تأیید برای دستورات حساس
- دستیار هوش مصنوعی محلی و مبتنی بر ابزار (در حال حاضر مسیریابی بر اساس کلیدواژه
  به ابزارهای واقعی Rust؛ در آینده قابل اتصال به یک مدل زبانی محلی یا از راه دور)
- پالت فرمان سریع (`Ctrl+K`)
- مرکز امنیت و جدول زمانی فعالیت‌ها (ذخیره در SQLite)
- بخش‌های سرویس‌ها، برنامه‌های راه‌اندازی و افزونه‌ها
- تنظیمات کامل: پوسته، زبان و **ساعات فعالیت قابل‌تنظیم توسط کاربر** (زمان باز
  و بسته شدن، روزهای فعال، وضعیت زنده «هم‌اکنون باز است» یا «باز شدن بعدی تا...»)
- پنج پوسته: تیره ویندوز ۱۱، روشن ویندوز ۱۱، پیش‌فرض ویندوز، قرمز (Crimson) و
  آبی (Azure)
- پشتیبانی کامل از سه زبان انگلیسی، فارسی و چینی با چیدمان صحیح راست‌چین
  (فارسی) و چپ‌چین (انگلیسی و چینی)

### ساختار پروژه
```
nexus/
├── src-tauri/            بک‌اند Rust (Tauri 2)
│   ├── src/
│   │   ├── main.rs
│   │   ├── db.rs
│   │   └── commands/      system, processes, files, network, terminal, ai, security, settings
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                   فرانت‌اند React + TypeScript
│   ├── components/
│   ├── i18n/               en.json / fa.json / zh.json
│   ├── store/
│   └── styles/
├── package.json
└── vite.config.ts
```

### پیش‌نیازها
- Node.js نسخه ۱۸ به بالا و npm
- زبان Rust (نسخه stable) از طریق rustup
- پیش‌نیازهای Tauri 2 برای ویندوز: Microsoft C++ Build Tools و WebView2

### نصب وابستگی‌ها
```
npm install
```
```
cargo install tauri-cli --version "^2.0.0"
```

### اجرا در حالت توسعه
```
npm run tauri dev
```

### ساخت نصب‌کننده نهایی ویندوز (.msi / .exe)
```
npm run tauri build
```
فایل نصب‌کننده در مسیر `src-tauri/target/release/bundle/` قرار می‌گیرد.

### نکات
- تمام اطلاعات سیستم به‌صورت زنده از طریق `sysinfo` و APIهای استاندارد سیستم‌عامل
  خوانده می‌شوند و هیچ داده‌ای ساختگی یا ثابت نیست.
- هر عملیات هوش مصنوعی یا ترمینال که دارای اثر جانبی است (حذف فایل، پایان دادن
  پردازش، اجرای دستور حساس) پیش از اجرا حتماً یک پنجره تأیید نمایش می‌دهد.
- تنظیمات و لاگ‌ها به‌صورت محلی در یک پایگاه‌داده SQLite ذخیره می‌شوند و هیچ
  اطلاعاتی از سیستم شما خارج نمی‌شود.

---

## 中文

### 项目简介
NEXUS 是一款新一代、完全本地化的桌面指挥中心，用于监控和控制你的电脑。其核心
（系统遥测、进程管理、文件操作、存储分析、网络、终端命令执行、安全事件记录以及
AI 工具路由）全部使用 **Rust** 实现。界面基于 **Tauri 2 + React + TypeScript**
构建，采用现代玻璃拟态、深色高级质感设计，并提供 Windows 11 风格的主题。

### 功能特性
- 实时概览仪表盘（CPU、内存、磁盘、运行时间、健康评分）——不使用任何模拟数据
- 高级进程管理器（搜索、排序、带确认提示的结束进程）
- 高级文件管理器（浏览、删除、重命名、复制/移动、文件哈希）
- 存储分析器（按文件类型统计、最大文件列表、重复文件检测）
- 网络中心（网络接口、流量统计、局域网设备扫描）
- 内置多会话终端，敏感命令执行前需二次确认
- 基于本地工具调用的 AI 助手（当前通过关键词路由到真实的 Rust 工具，未来可在不
  改变工具接口的前提下接入本地或远程大语言模型）
- 命令面板（快捷键 `Ctrl+K`）
- 安全中心与活动时间线（数据存储于 SQLite）
- 服务、启动项与插件管理面板
- 完整设置中心：主题、语言，以及**用户可自定义的营业时间**（开始/结束时间、
  活跃星期、实时显示"当前开放"或"距下次开放还有..."状态）
- 五种主题：Windows 11 深色、Windows 11 浅色、Windows 默认、绯红（Crimson）、
  天蓝（Azure）
- 完整支持英语、波斯语（فارسی）、中文三种语言，并正确实现波斯语从右到左（RTL）
  与英语、中文从左到右（LTR）的布局切换

### 项目结构
```
nexus/
├── src-tauri/            Rust 后端 (Tauri 2)
│   ├── src/
│   │   ├── main.rs
│   │   ├── db.rs
│   │   └── commands/      system, processes, files, network, terminal, ai, security, settings
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                   React + TypeScript 前端
│   ├── components/
│   ├── i18n/               en.json / fa.json / zh.json
│   ├── store/
│   └── styles/
├── package.json
└── vite.config.ts
```

### 环境要求
- Node.js 18 及以上版本，以及 npm
- Rust（stable 工具链），通过 rustup 安装
- Windows 平台 Tauri 2 所需前置组件：Microsoft C++ Build Tools 与 WebView2

### 安装依赖
```
npm install
```
```
cargo install tauri-cli --version "^2.0.0"
```

### 开发模式运行
```
npm run tauri dev
```

### 构建正式版 Windows 安装包（.msi / .exe）
```
npm run tauri build
```
生成的安装包位于 `src-tauri/target/release/bundle/` 目录下。

### 说明
- 所有系统数据均通过 `sysinfo` 及标准操作系统 API 实时读取，不包含任何模拟或
  硬编码数据。
- 任何具有副作用的 AI 或终端操作（删除文件、结束进程、执行敏感命令）在执行前
  都会弹出确认对话框。
- 设置与日志均保存在本地的 SQLite 数据库中，任何信息都不会发送到你的电脑之外。
