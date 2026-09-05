# KinChronicles

KinChronicles is a modern web application designed for creating, managing, and exploring complex family trees and timelines. Built with React and Vite, it offers a rich, interactive experience for genealogists, world-builders, and fantasy authors.

## Features & Capabilities

KinChronicles operates on a freemium model. Here is exactly what is available in the current version of the application:

### Free Tier ($0 / forever)
- **Interactive Family Trees:** Create and edit complex family relationships with an intuitive drag-and-drop graph editor (powered by React Flow).
- **Up to 150 Characters:** Add up to 150 characters per family tree.
- **Rich Node Data:** Manage detailed character information, including biographies, titles, traits, image galleries, and custom card colors.
- **Dynamic Routing:** Auto-layout capabilities and specialized routing for spouses, adopted children, and illegitimate lines.
- **Export Capabilities:** Export your family trees to high-quality images.
- **Cloud Sync & Auth:** Save your trees securely to the cloud and manage multiple trees via Supabase.

### Pro Tier ($5.00 / month)
*Everything in the Free tier, plus:*
- **Unlimited Characters:** No limits on the number of characters you can add to a single tree.
- **Custom Fantasy Calendars:** Design bespoke calendars with custom months and days. Link these calendars to your Family Trees to track character lifespans and reigns using precise, custom fantasy dates (e.g., *14th of Frostfall 1066*).
- **Timeline Builder:** Construct detailed historical timelines using your custom calendars, and link events directly to characters in your family trees.
- **Novel Writer Module:** *(Coming Soon)*
- **Priority Support**

---

## Technical Notes: Backend & Database

The frontend structure for Family Tree custom calendars is now fully implemented. When you associate a calendar with a tree, the `baseCalendarId` is seamlessly embedded into the tree's JSON `data` payload when saved to Supabase. 

**Backend Requirements for Calendars:**
Because the Supabase implementation leverages a flexible JSONB column (`data`) to store the tree's state (including the `baseCalendarId`), **no immediate backend changes or schema migrations are required** to make this feature work. It functions perfectly out-of-the-box.

However, if you wish to implement strict relational data integrity in the future, you may consider:
1. **Adding a Column:** Extracting `base_calendar_id` from the JSON payload into its own dedicated UUID column on the `trees` table.
2. **Foreign Keys:** Setting up a foreign key constraint linking `trees.base_calendar_id` to `calendars.id` to prevent users from deleting a calendar that is actively being used by a tree.
