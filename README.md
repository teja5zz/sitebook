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

Firebase Details

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC21OiEepDOcDrUkqoowEEEkaKE2UCXpLY",
  authDomain: "sitebook-4e7de.firebaseapp.com",
  projectId: "sitebook-4e7de",
  storageBucket: "sitebook-4e7de.firebasestorage.app",
  messagingSenderId: "244998211066",
  appId: "1:244998211066:web:5dd6ea452223c04e3a1043",
  measurementId: "G-SR4PDXNL7E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
