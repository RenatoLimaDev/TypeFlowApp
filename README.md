<div align="center">

# TypeFlow

**Overlay de notas flutuante para desktop**

![Tauri](https://img.shields.io/badge/Tauri_v2-24C8D8?style=flat&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-CE422B?style=flat&logo=rust&logoColor=white)

</div>

---


TypeFlow é um overlay minimalista que fica sobre todas as janelas, permitindo capturar pensamentos e notas sem interromper o fluxo de trabalho. Bundle < 5MB.
<div align="center">
## Stack

| Camada | Tecnologia |
|---|---|
| Runtime nativo | Tauri v2 |
| UI | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v3 |
| Estado | Zustand + Immer |
| Backend | Rust |
</div>

## Estrutura

```
typeflow/
├── src/
│   ├── components/
│   │   ├── card/          # Card de digitação
│   │   ├── viewer/        # Lista de sessões + drill-down
│   │   └── onboarding/    # Painel de atalhos inicial
│   ├── hooks/             # useGhostInput
│   ├── lib/               # sound, ruler, storage, pdf, utils
│   ├── store/             # Zustand stores
│   ├── styles/            # globals.css (Tailwind)
│   ├── types/             # TypeScript types
│   └── windows/           # Entrypoints de cada janela
│       ├── card/
│       ├── viewer/
│       └── onboarding/
└── src-tauri/
    ├── src/
    │   ├── main.rs
    │   ├── windows.rs     # Criação das 3 janelas
    │   ├── tray.rs        # System tray
    │   ├── shortcuts.rs   # Atalhos globais
    │   └── keyboard.rs    # Captura global de teclado
    ├── capabilities/
    ├── Cargo.toml
    └── tauri.conf.json
```

## Desenvolvimento

```bash
npm install
npm run tauri:dev
```

## Build

```bash
npm run tauri:build
```

Gera o executável em `src-tauri/target/release/bundle/`.
<div align="center">
## Atalhos

| Atalho | Ação |
|---|---|
| `Ctrl + Alt + V` | Abrir / fechar sessions |
| `Ctrl + Alt + S` | Som on / off |
| `Ctrl + Alt + C` | Click-through |
| `Enter` | Próxima linha |
| `Ctrl + Enter` | Finalizar sessão |
| `Ctrl + Z` | Desfazer |
| `Esc` | Voltar / fechar |
</div>
