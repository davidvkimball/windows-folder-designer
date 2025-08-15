# Windows Folder Designer (Alpha)

Create custom Windows folder icons that can be exported in multiple formats and sizes (ICO files or PNGs).

## Features
- Visual layer-based icon editing with real-time preview
- Support for multiple icon sizes (16px to 256px)
- Color customization with solid colors and gradients (toggleable)
- Image upload and positioning with support for regular images and ICO files
- Client-side ICO file parsing with automatic size separation for existing Windows icons
- Client-side export to ICO format or PNG zip archives using Canvas API
- Dark-themed UI optimized for design work
- Fully serverless architecture compatible with Netlify deployment

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for client-server monorepo setup
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom dark theme variables
- **State Management**: React useState hooks for local component state
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Canvas Rendering**: HTML5 Canvas API with custom renderer class for icon generation
- **Image Processing**: Client-side Canvas API and FileReader for all image processing

## Architecture
- **Frontend**: React 18 with TypeScript running in the browser
- **Processing**: Client-side processing using Canvas API, FileReader, and browser-native image handling
- **Export**: Client-side ICO and PNG generation using Canvas API
- **Build System**: Vite build system with TypeScript support
- **Deployment**: Static site compatible with any hosting platform

## Canvas and Icon Generation System
- **Rendering Engine**: Custom ClientIconGenerator class handling layer composition with Canvas API
- **Layer Types**: Back folder, front folder, and user image layers
- **Color System**: Support for solid colors, linear gradients, and radial gradients with Windows 11-style diagonal gradients
- **Position System**: Granular positioning controls with universal vs. per-size customization, including X/Y sliders and preset grid positions
- **Export Pipeline**: Client-side multi-size PNG generation with ICO file creation using Canvas API
- **Image Processing**: Client-side Canvas API and FileReader for image optimization and resizing
- **ICO Processing**: ClientIcoProcessor for parsing ICO files and extracting size-specific images in browser

## Component Architecture
- **Layered Design**: Separation between UI components, business logic, and rendering
- **Type Safety**: Comprehensive TypeScript types with Zod schema validation
- **Reusable Components**: Modular UI components for color pickers, layer panels, and canvas controls
- **State Flow**: Unidirectional data flow with prop drilling for component communication

# External Dependencies

## Core Dependencies
- **sharp** - High-performance image processing library for SVG and image manipulation
- **jszip** - Library for creating ZIP archives of exported icons

## UI and Styling
- **@radix-ui/react-*** - Headless UI primitives for accessible components
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** - For building variant-based component APIs
- **lucide-react** - Icon library for UI elements
- **clsx** & **tailwind-merge** - Utility functions for managing CSS classes

## Development and Build Tools
- **vite** - Fast build tool and development server
- **tsx** - TypeScript execution for Node.js
- **esbuild** - Fast JavaScript bundler for production builds
- **typescript** - For type-safe development

## File Processing
- **sharp** - High-performance image processing and SVG manipulation
- **Custom ICO Parser** - Client-side ICO file parsing to extract individual size images
- **Canvas API** - Browser-native image processing and ICO generation

## React Ecosystem
- **@tanstack/react-query** - Server state management and caching
- **@hookform/resolvers** - Form validation resolvers
- **wouter** - Lightweight React router
- **zod** - Runtime type checking and validation
