# SVUH Clinical Trial Tracker

A full-stack application for tracking clinical trial participants at St Vincent's University Hospital. Built with React (Vite) and Express (PostgreSQL).

## Getting Started

### 1. Prerequisites
- **Node.js**: v18 or higher recommended.
- **PostgreSQL**: Ensure a local instance is running.

### 2. Installation
Install dependencies for both the frontend and backend:
```bash
# Install root (frontend) dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 3. Database Setup
1. Create a PostgreSQL database named `clinical_trials`.
2. Copy `server/.env.example` to `server/.env` and update your database credentials.
3. Seed the database with sample St Vincent's data:
   ```bash
   cd server
   npm run seed
   cd ..
   ```

### 4. Running the App
You can start both the frontend and backend concurrently with a single command from the root directory.

*   **Using NPM**:
    ```bash
    npm run dev
    ```
*   **Windows Quick-Start**:
    Double-click `start.bat` or run `.\start.ps1` in the root directory.

> [!TIP]
> The application will automatically detect if the database is empty on first run and seed it with the sample data and admin accounts for you.

---

## Default Login Details

After seeding the database, you can use the following accounts:

### **Admin Account**
*   **Email**: `admin@svuh.ie`
*   **Password**: `admin123`

### **Staff Accounts**
| Role | Email | Password |
| :--- | :--- | :--- |
| **Coordinator** | `coord@svuh.ie` | `password123` |
| **Researcher** | `s.obrien@svuh.ie` | `password123` |
| **Researcher** | `c.murphy@svuh.ie` | `password123` |
| **Researcher** | `a.walsh@svuh.ie` | `password123` |
| **Researcher** | `d.flanagan@svuh.ie` | `password123` |

---

## Project Structure
*   `src/`: React frontend application.
*   `server/`: Express backend API and database logic.
*   `start.bat` / `start.ps1`: Helper scripts to launch the full stack.
*   `package.json`: Main entry point for scripts and dependencies.
