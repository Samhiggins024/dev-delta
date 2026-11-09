# Sam's Restaurant Inventory

Tagline: A front-end restaurant directory with authentication, authorization, session state, and admin tooling.

- Author: Sam
- Version: 0.3
- Date: 2026-11-09

## Problem and Narrative

People often forget the restaurants they enjoy, or at least I do. Sam's Restaurant Inventory helps keep a personal list of favorite restaurants in one place so the user can quickly remember where they liked to eat, compare options, and manage the list over time.

## User Story

As a person who wants to have a place to keep favorite restaurants, I want an app that stores the restaurants information, so I can remember where I like to eat and where those good spots are.

## Current Functionality

- Authentication with demo test accounts
- Authorization rules that affect admin vs user behavior
- JSON-based restaurant content loaded with fetch()
- CRUD operations for restaurant records
- Session storage persistence for app state
- Admin dashboard showing current user, app data, session data, and complete JSON state
- Search, category filtering, and rating sort on the home page

## AuthN / AuthZ

The app includes two developmental accounts:

- Admin: username admin, password admin123
- User: username user, password user123

These credentials are intentionally visible in the browser console for teaching purposes. The app authenticates against these values and stores the active session in sessionStorage. The current user object includes username, authenticated, and role.

Regular users can view and manage their own entries. Admin users can also access the admin dashboard and delete or edit all records.

## Data Flow

AUTH ──────────────────┐
                       │
STATIC JSON ──fetch()──┼──→ appState
                       │       ↓
USER INPUT ────────────┘   sessionStorage
                               ↓
                              DOM

## Technology Stack

- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- Bootstrap Icons
- Google Fonts
- GitHub Pages compatibility

## Project Structure

```text
dev-bravo-main/
├── asset/
│   ├── js/
│   │   └── app.js
│   └── styles/
│       └── terminal.css
├── data/
│   └── restaurants.json
├── pages/
│   ├── admin.html
│   ├── restuarant.html
│   └── signin.html
├── index.html
└── README.md

```

## Testing

Manual checks:

- Confirm both demo accounts appear in the console on load.
- Sign in as the user and verify the standard interface is available.
- Test create, update, and delete actions from the restaurant manager.
- Sign out and sign in again with the admin account.
- Open the admin dashboard and confirm full app state is visible.
- Refresh the page and confirm the active session persists.

## Known Issues

- This is a front-end prototype without a real backend database.
- Authentication is intentionally insecure and educational only.
- The app stores state in browser sessionStorage instead of server-side persistence.

## Future Development

- Add real backend authentication with secure hashing.
- Replace sessionStorage with a database and API layer.
- Add user-specific favorites and richer filtering.
- Expand the admin dashboard with analytics and audit logs.

## Resources and Attribution

- Bootstrap CDN for layout and styling
- Google Fonts for typography
- Normalized CSS reset
- AI assistance was used to help structure the app and refine the front-end data workflow
