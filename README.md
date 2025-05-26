# Device Status Central

This is a web-based dashboard for managing 7-11 branches, including user creation, branch assignment, and real-time updates on equipment like AC and refrigerators. It uses **Firebase Authentication**, **Cloud Firestore**, **Cloud Real Time Database**, and **Firebase Hosting**.

---

##  Features

- User authentication (login/logout)
- Role-based access (Head Office, Regional Manager, Branch Manager)
- Create new branches and assign users
- Region-based branch mapping
- Modular JavaScript and clean folder structure
- Firebase integration for hosting and real-time Firestore database
- GitHub Actions CI for Firebase Hosting deployment

---

## Getting Started

### Prerequisites

- Node.js and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Authentication and Firestore enabled

### Clone the Repository

```bash
git clone https://github.com/klubadudel/device-status-central.git
cd device-status-central
```

### Install Dependencies

```bash
npm install
```
### Run Locally

```bash
npm run dev
```
---

## Firebase Setup

1. Login to Firebase:

```bash
firebase login
```

2. Initialize Firebase (if not already):

```bash
firebase init
```

3. Set up `.firebaserc` with your project ID:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

4. Update `firebase.json` and `firestore.rules` as needed.

---

## 📁 Project Folder Structure

This project follows a modular structure combining **Next.js**, **Firebase**, and **Tailwind CSS** for full-stack web development. Below is an overview of the folder organization and key configuration files.

```bash
├── .idx/                         # Indexing metadata (can be ignored)
├── .next/                        # Next.js build output (auto-generated)
├── .vscode/                      # VSCode workspace settings
├── docs/                         # Project documentation
├── functions/                    # Firebase Cloud Functions
├── node_modules/                 # Node.js packages
├── public/                       # Static assets (images, icons, etc.)
├── src/                          # Application source code
├── .env                          # Environment variables
├── .firebaserc                   # Firebase project configuration
├── .gitignore                    # Git ignored files
├── .modified                     # Custom project tracking or notes
├── components.json               # UI component metadata (if applicable)
├── firebase.json                 # Firebase hosting and configuration
├── Firestore Security Rules/     # Firestore rules folder
│   └── firestore.rules           # Firestore security rules file
├── next-env.d.ts                 # Next.js TypeScript environment declaration
├── next.config.ts                # Next.js configuration
├── package-lock.json             # npm lock file
├── package.json                  # Project metadata and dependencies
├── postcss.config.mjs            # PostCSS configuration for Tailwind
├── README.md                     # Project overview
├── tailwind.config.ts            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript compiler configuration

```

## Deployment

Deploy to Firebase Hosting:

```bash
firebase deploy
```

GitHub Actions will also automatically deploy on merge to `main`.

---

## Security Rules (Firestore)

Make sure your Firestore rules support authentication:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /branches/{branchId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Future Improvements

- Add device monitoring per branch (AC/refrigerators)
- Real-time dashboards with Firebase listeners
- Region filters or maps
- Role management UI

---

## License

This project is licensed under the MIT License.
