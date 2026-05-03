# SprintGrid

SprintGrid is a robust, real-time Agile project management tool designed to streamline sprint planning, task tracking, and team collaboration. Built with a modern full-stack architecture, it features a fluid drag-and-drop Kanban board, interactive timelines, and instant WebSocket synchronization.

## Key Features

* **Real-Time Kanban Board:** Drag-and-drop tasks across statuses with instant WebSocket synchronization across all connected clients.
* **Fluid UI Layout:** A responsive, auto-scaling board design that eliminates horizontal scrolling and adapts perfectly to your workspace.
* **Interactive Timeline View:** Visualize project schedules with drag-to-resize task durations and deadline tracking.
* **Advanced Task Management:** Support for task priorities, blockers, deadlines, and file attachments.
* **Role-Based Access Control (RBAC):** Granular permissions for workspace Owners, Admins, Subadmins, and Members via secure invite links.
* **Comprehensive Activity Audit:** A real-time timeline tracking all task movements, creations, and project updates.
* **AI Sprint Assistant:** Automated workflow generation to quickly break down project goals into actionable tasks.

## Tech Stack

**Frontend**
* Framework: Next.js (App Router)
* Library: React
* Styling: Tailwind CSS
* State Management: Zustand
* Drag and Drop: @hello-pangea/dnd
* Real-time: Socket.io-client

**Backend**
* Runtime: Node.js
* Framework: Express.js
* Database ORM: Prisma
* Real-time: Socket.io
* Authentication: JSON Web Tokens (JWT) & bcrypt

## Project Structure

This project uses a monorepo structure, separating the client application and the API server.

```text
SprintGrid/
├── frontend/       # Next.js application
└── backend/        # Node.js/Express API & Prisma ORM
```

## Prerequisites

Before you begin, ensure you have the following installed:
* Node.js (v18 or higher)
* npm, yarn, or pnpm
* Git

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yashgrathod/SprintGrid-Official.git
cd SprintGrid-Official
```

### 2. Backend Setup
Navigate to the backend directory to install dependencies and configure the database.

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="file:./dev.db" 
JWT_SECRET="generate_a_strong_random_secret_here"
```

Initialize the database and start the server:
```bash
npx prisma db push
npm run dev
```

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies.

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start the development server:
```bash
npm run dev
```

### 4. Access the Application
Open your browser and navigate to `http://localhost:3000`. You can now register a new account, create a workspace, and start managing sprints.

## License

This project is licensed under the MIT License.
