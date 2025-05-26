🏗️ SiteWise – Construction Tracking App
1. Project Dashboard

    View a list of all active/inactive projects.

    Search and filter projects by name, location, or client.

2. Project Details Tab

Each project has its own detail screen with:

    Project Name

    Client Name

    Client Phone Number

    Site Address

    Project Start & End Dates

    Status (Ongoing, Completed, On Hold, etc.)

3. Invoices Tab

    Generate invoices with:

        Auto-generated invoice number

        Date

        Client name and project

        Line items (description, quantity, rate, amount)

        Tax calculations (if any)

    Edit/Delete invoices

    Mark invoice as Paid or Pending

    Export to PDF/Share directly

    Create Acknowledgement Receipt upon payment:

        Client name

        Amount received

        Date

        Payment mode

        Signature/Seal area (optional)

4. Expenses Tab

    Subsections:

        Worker Payments

            Name of worker

            Work type (e.g., mason, laborer)

            Amount

            Date

        Materials Procured

            Material name

            Vendor name

            Quantity

            Cost

            Invoice/photo upload

        Materials Indent

            Requested by (person)

            Items listed

            Date required

            Status (Pending/Procured)

        Miscellaneous Payments

            Description

            Amount

            Date

5. Site Personnel Tab

    List of key personnel with roles and phone numbers:

        Electrician

        Plumber

        Site Engineer

        Architect (optional)

    Call or WhatsApp directly from app

6. Client Acknowledgement Receipt (Auto-Generated)

    On receiving payment, generate:

Acknowledgement Receipt

Received from: [Client Name]
Project: [Project Name]
Amount: ₹[Amount]
Payment Mode: [Cash/Bank Transfer/UPI]
Date: [Date]

Thank you for your payment.

-- SiteWise

Option to send via PDF or WhatsApp/email

Further Potential Enhancements (Beyond this initial version):

    Advanced Invoice Generation: PDF export for invoices.
    Reporting: Summaries of expenses, income, etc.
    User Roles & Permissions: If multiple users need to access the system.
    Notifications: For overdue invoices or other important events.
    File Attachments: For invoices, expense receipts, etc.
    Full-text Search: For projects, invoices, etc.
    More Detailed Material Indent Workflow: Tracking indent status changes more explicitly.
    Error Handling and UI Feedback: More granular error messages and loading states.
    Automated Deletion of Subcollections: When a project is deleted, its associated invoices, expenses, and contacts should also be deleted (this requires more complex Firestore logic).
