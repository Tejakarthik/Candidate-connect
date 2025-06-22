# CandidateConnect - Real-Time Candidate Management & Collaboration

CandidateConnect is a modern, real-time web application designed to streamline the candidate tracking and evaluation process for recruiting teams. Built with Next.js and Firebase, it provides a collaborative environment where users can manage candidate pipelines, share notes with `@mentions`, and receive instant notifications, all within a clean, responsive, and secure interface.

**[LIVE DEMO URL]** - https://candidate-connect-git-main-tejakarthiks-projects.vercel.app/login
**[VIDEO WALKTHROUGH]** - *Replace with your Loom link*

---

## Features

*   **Real-Time Collaboration**: Notes and notifications update instantly across all user sessions using Firestore's real-time listeners.
*   **Secure Authentication**: Robust user sign-up and login system (email/username & password) powered by Firebase Authentication.
*   **Candidate Management**: Easily add, view, and manage candidates in a central dashboard. Update candidate status with a single click.
*   **Collaborative Notes with @Mentions**: Leave time-stamped notes on candidate profiles and mention other users to send them targeted notifications.
*   **Notification System**: A dedicated panel shows real-time notifications for mentions and other key events, ensuring users never miss an update.
*   **Access Control**: Candidates can only be viewed by users who created them or have been explicitly granted access.
*   **Comprehensive Audit Trail**: A complete, immutable history of all actions taken on a candidate (creation, status changes, note edits, etc.) is recorded for transparency and compliance.
*   **Role-Based Permissions**: Users can only edit/delete notes they authored, and only the original creator can delete a candidate.
*   **Polished & Accessible UI**: The interface is fully responsive, accessible (a11y), and provides an excellent user experience on both desktop and mobile devices.
*   **Input Sanitization**: All user-generated content is sanitized to prevent XSS attacks.

---

## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (React)
*   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI/UX**:
    *   **Toast Notifications**: Sonner
    *   **Date Formatting**: date-fns
    *   **Icons**: lucide-react

---

## Getting Started

### Prerequisites

*   Node.js (v18 or later)
*   npm or yarn
*   A Firebase project

### 1. Clone the Repository

```bash
git clone https://github.com/Tejakarthik/Candidate-connect.git
cd Candidate-connect
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Create a file named `.env.local` in the root of your project and add your Firebase project configuration. You can find these keys in your Firebase Console under **Project settings > General**.

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`.

---

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/).

1.  Push your code to a public GitHub repository.
2.  Go to Vercel and import the repository.
3.  Vercel will automatically detect that it is a Next.js project.
4.  In the project settings on Vercel, navigate to **Settings > Environment Variables** and add the same Firebase keys from your `.env.local` file.
5.  Deploy! Your application will be live. 
