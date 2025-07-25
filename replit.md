# Lua Code Obfuscator/Deobfuscator

## Overview

This is a full-stack web application that provides Lua code obfuscation and deobfuscation services. The application features a modern React frontend with a Node.js/Express backend, designed specifically for processing Lua scripts with various obfuscation techniques.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Code Editor**: Monaco Editor with custom Lua/Roblox theme

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API structure
- **Request Validation**: Zod schemas for type-safe validation
- **Development**: Hot reload with Vite integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Fallback Storage**: In-memory storage for development/testing
- **Schema Management**: Drizzle Kit for migrations and schema management

## Key Components

### Core Processing Service
- **Lua Processor**: Handles code obfuscation and deobfuscation logic
- **Variable Renaming**: Renames local variables with obfuscated names
- **String Encoding**: Encodes string literals for obfuscation
- **Processing Statistics**: Tracks metrics like processing time, lines changed, variables renamed

### API Endpoints
- `POST /api/process`: Main endpoint for processing Lua code with configurable settings

### Frontend Features
- **Code Editor**: Dual-pane Monaco editor for input/output code
- **Processing Settings**: Configurable obfuscation options (variable renaming, string encoding, obfuscation levels)
- **Statistics Display**: Real-time processing metrics and performance data
- **Responsive Design**: Mobile-friendly interface with proper breakpoints

### Database Schema
- **Users Table**: User management with username/password authentication
- **Processed Scripts Table**: Stores processing history with input/output code, settings, and metrics

## Data Flow

1. **User Input**: User pastes Lua code into the Monaco editor
2. **Settings Configuration**: User selects obfuscation/deobfuscation mode and processing options
3. **API Request**: Frontend sends POST request to `/api/process` with code and settings
4. **Processing**: Backend validates request and processes code through Lua processor service
5. **Database Storage**: Processed script and metrics are stored in PostgreSQL
6. **Response**: Backend returns processed code with statistics
7. **Display**: Frontend updates output editor and shows processing metrics

## External Dependencies

### Frontend Dependencies
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **Code Editor**: Monaco Editor for advanced code editing features
- **HTTP Client**: Native fetch API with TanStack Query wrapper

### Backend Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod for runtime type checking and validation
- **Development Tools**: TSX for TypeScript execution, ESBuild for production builds

### Development Tools
- **TypeScript**: Full type safety across the stack
- **Vite**: Fast development server and build tool
- **Drizzle Kit**: Database migration and schema management
- **Replit Integration**: Special handling for Replit development environment

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: Drizzle manages schema migrations

### Environment Configuration
- **Development**: Uses TSX for hot reload and Vite dev server
- **Production**: Serves static files from Express with compiled backend bundle
- **Database**: Configured via `DATABASE_URL` environment variable

### Scripts
- `npm run dev`: Development mode with hot reload
- `npm run build`: Production build for both frontend and backend  
- `npm run start`: Production server
- `npm run db:push`: Push database schema changes

The application is designed to be easily deployable on various platforms, with special considerations for Replit's environment including the cartographer plugin and runtime error overlay for enhanced development experience.