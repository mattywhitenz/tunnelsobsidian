# Obsidian Tunnels Plugin - Project Plan

## Quickstart (Development)

1. Install dependencies

```
npm install
```

2. Start dev build (rebuilds on change)

```
npm run dev
```

3. Load into Obsidian

- In Obsidian, enable community plugins
- Create a test vault folder
- Inside the vault, create `.obsidian/plugins/tunnelsobsidian/`
- Copy `manifest.json` and `main.js` from this repo into that folder
- Reload plugins in Obsidian

4. Build for release

```
npm run build
```

---

## Project Overview
Create an Obsidian plugin that allows users to send notes to external URLs via configurable "tunnels" and handle responses with multiple action options.

## Core Features
- **Tunnels Management**: Create, edit, and delete named tunnels with descriptions and URLs.
- **Note Transmission**: Convert current note to PDF and POST to configured URL.
- **Response Handling**: Display response and offer multiple action options.
- **User Interface**: Hotkey support and right-click context menu integration.

## Technical Architecture

### 1. Data Models
```typescript
interface Tunnel {
  id: string;
  name: string;
  description: string;
  url: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'PUT';
  createdAt: Date;
  lastUsed?: Date;
}

interface TunnelResponse {
  success: boolean;
  data?: string;
  error?: string;
  timestamp: Date;
}
```

### 2. Core Components
- **TunnelManager**: CRUD operations for tunnels.
- **PDFGenerator**: Convert note content to PDF.
- **APIClient**: Handle HTTP requests to tunnel URLs.
- **ResponseHandler**: Manage user response actions.
- **SettingsTab**: Plugin configuration interface.
- **CommandManager**: Hotkey and menu integration.

## Development Phases

### Phase 1: Foundation
**Goal**: Basic plugin structure and tunnel management.

#### Tasks:
- Set up Obsidian plugin development environment.
- Create basic plugin manifest and main class.
- Implement Tunnel data model and storage.
- Build tunnel CRUD operations.
- Create settings tab for tunnel management.
- Add basic validation for tunnel configurations.

#### Deliverables:
- Plugin boilerplate with settings tab.
- Functional tunnel creation/editing interface.
- Local storage of tunnel configurations.

### Phase 2: PDF Generation
**Goal**: Convert notes to PDF format.

#### Tasks:
- Research PDF generation libraries (puppeteer, jsPDF, or html2pdf).
- Implement note content extraction.
- Handle Obsidian markdown rendering.
- Support for embedded images and attachments.
- Add PDF generation settings (format, margins, etc.).
- Error handling for PDF generation failures.

#### Deliverables:
- Working PDF generation from note content.
- Support for basic Obsidian formatting.
- Configurable PDF options.

### Phase 3: API Integration
**Goal**: Send PDFs to external URLs and handle responses.

#### Tasks:
- Implement HTTP client with file upload support.
- Add authentication header support.
- Implement retry logic and error handling.
- Add timeout configuration.
- Create response parsing and validation.
- Add logging for debugging.

#### Deliverables:
- Functional API communication.
- Robust error handling and user feedback.
- Configurable request parameters.

### Phase 4: User Interface
**Goal**: Hotkeys, context menus, and response handling.

#### Tasks:
- Implement hotkey registration and handling.
- Add right-click context menu integration.
- Create tunnel selection interface (if multiple tunnels).
- Build response display modal.
- Implement response action buttons.
- Add progress indicators and loading states.

#### Deliverables:
- User-friendly interface with hotkey and context menu support.
- Interactive response handling features.
