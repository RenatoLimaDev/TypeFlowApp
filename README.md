# TypeFlow

Overlay de notas flutuante para desktop. Construído com **Tauri v2 + React + TypeScript + Vite**.

## Stack

- **Tauri v2** — runtime nativo, bundle < 5MB
- **React 18** + **TypeScript** — UI
- **Vite** — build tool
- **Tailwind CSS v3** — styling
- **Zustand** + **Immer** — estado global
- **Rust** — janelas, shortcuts globais, tray

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
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── windows.rs     # Criação das 3 janelas
│   │   ├── tray.rs        # System tray
│   │   └── shortcuts.rs   # Atalhos globais
│   ├── icons/
│   ├── capabilities/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

## Desenvolvimento

```bash
npm install
npm run tauri:dev
```

## Build portátil

```bash
npm run tauri:build
```

Gera `src-tauri/target/release/bundle/` com o executável.

## Atalhos

| Atalho | Ação |
|--------|------|
| `Ctrl + Alt + V` | Abrir / fechar sessions |
| `Ctrl + Alt + S` | Som on / off |
| `Ctrl + Alt + C` | Click-through |
| `Enter` | Próxima linha |
| `Ctrl + Enter` | Finalizar sessão |
| `Ctrl + Z` | Desfazer |
| `Esc` | Voltar / fechar |
