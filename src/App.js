import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, addDoc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, serverTimestamp, Timestamp, getDocs, arrayUnion } from 'firebase/firestore';
import { Plus, X, Edit3, Trash2, Briefcase, FileText, Users, DollarSign, ShoppingCart, ClipboardList, MessageSquare, Home, ExternalLink, Building, TrendingUp, TrendingDown, MinusCircle, Archive, Printer, ListOrdered, Sparkles, Search, Settings, Info, Construction, Coins, Percent, Hash, Mail, MessageCircle as WhatsAppIcon, CheckCircle } from 'lucide-react';
import { getAnalytics } from 'firebase/analytics';
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// --- Firebase Configuration ---
const firebaseConfig ={
    apiKey: "AIzaSyC21OiEepDOcDrUkqoowEEEkaKE2UCXpLY",
    authDomain: "sitebook-4e7de.firebaseapp.com",
    projectId: "sitebook-4e7de",
    storageBucket: "sitebook-4e7de.firebasestorage.app",
    messagingSenderId: "244998211066",
    appId: "1:244998211066:web:5dd6ea452223c04e3a1043",
    measurementId: "G-SR4PDXNL7E",
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'site-book-default';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Set persistence to local
setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
        console.error("Error setting persistence: ", error);
    });


// --- Helper Functions ---
const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
    }
    if (typeof timestamp === 'string') {
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString();
        } catch (e) {
            return 'N/A';
        }
    }
    if (typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    return 'N/A';
};

const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
};

const calculateInvoiceTotal = (invoice) => {
    if (!invoice) return 0;
    const lineItemsArray = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    const subTotal = lineItemsArray.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)), 0);

    const discountVal = parseFloat(invoice.discountValue || 0);
    const discountAmount = invoice.discountType === 'percentage' ? (subTotal * discountVal / 100) : discountVal;
    const amountAfterDiscount = subTotal - discountAmount;
    const taxVal = parseFloat(invoice.taxRate || 0);
    const taxAmount = amountAfterDiscount * (taxVal / 100);
    const otherChargesVal = parseFloat(invoice.otherCharges || 0);
    return amountAfterDiscount + taxAmount + otherChargesVal;
};


// --- Gemini API Helper ---
const callGeminiAPI = async (prompt) => {
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Gemini API Error Response:", errorBody);
            throw new Error(`Gemini API request failed with status ${response.status}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error("Unexpected Gemini API response structure:", result);
            throw new Error("Failed to extract text from Gemini API response.");
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
};


// --- Reusable Components ---
const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
    if (!isOpen) return null;
    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl"
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 z-50">
            <div className={`bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[95vh] overflow-y-auto`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

const Input = ({ label, id, name, type = "text", value, onChange, placeholder, required = false, disabled = false, icon, step, className = "" }) => (
    <div className={`mb-4 ${className}`}>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <div className="relative">
            {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
            <input
                type={type}
                id={id}
                name={name || id}
                value={value === null || value === undefined ? '' : value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                step={step}
                className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 ${icon ? 'pl-10' : ''}`}
            />
        </div>
    </div>
);

const Textarea = ({ label, id, name, value, onChange, placeholder, required = false, rows = 3, disabled = false, className = "" }) => (
    <div className={`mb-4 ${className}`}>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <textarea
            id={id}
            name={name || id}
            value={value === null || value === undefined ? '' : value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            rows={rows}
            disabled={disabled}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
        />
    </div>
);

const Button = ({ onClick, children, variant = "primary", type = "button", disabled = false, className = "" }) => {
    const baseStyles = "px-4 py-2 rounded-md font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors duration-150";
    const variants = {
        primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500",
        secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white focus:ring-gray-400",
        danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
        ai: "bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500",
        success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
        info: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
    };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {children}
        </button>
    );
};

const IconButton = ({ onClick, icon, tooltip, className = "" }) => (
    <button
        onClick={onClick}
        title={tooltip}
        className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors duration-150 ${className}`}
    >
        {icon}
    </button>
);

const LoadingSpinner = ({ small = false }) => (
    <div className={`flex justify-center items-center ${small ? 'h-5' : 'h-full py-8'}`}>
        <div className={`animate-spin rounded-full border-t-2 border-b-2 border-indigo-500 ${small ? 'h-5 w-5' : 'h-12 w-12'}`}></div>
    </div>
);

const EmptyState = ({ message, icon }) => (
    <div className="text-center py-8 px-4 text-gray-500 dark:text-gray-400">
        {icon && <div className="flex justify-center mb-2 text-gray-400 dark:text-gray-500">{icon}</div>}
        <p>{message}</p>
    </div>
);

// --- Main Application Structure ---
function App() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentView, setCurrentView] = useState('projects');

    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [newProjectData, setNewProjectData] = useState({
        name: "", description: "", clientName: "", address: "", clientBudget: "", sourceOfEnquiry: ""
    });


    useEffect(() => {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            setIsDarkMode(e.matches);
            document.documentElement.classList.toggle('dark', e.matches);
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    try {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } catch (error) {
                        console.error("Error signing in with custom token, trying anonymous:", error);
                        await signInAnonymously(auth);
                    }
                } else {
                    await signInAnonymously(auth);
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isAuthReady || !userId) {
            setIsLoadingProjects(false);
            return;
        }
        setIsLoadingProjects(true);
        const projectsPath = `/artifacts/${appId}/users/${userId}/projects`;
        const q = query(collection(db, projectsPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(projectsData);
            setIsLoadingProjects(false);
        }, (error) => {
            console.error("Error fetching projects:", error);
            setIsLoadingProjects(false);
        });
        return () => unsubscribe();
    }, [isAuthReady, userId]);

    const handleNewProjectInputChange = (e) => {
        const { name, value } = e.target;
        setNewProjectData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        if (!userId || !newProjectData.name.trim()) return;
        const projectsPath = `/artifacts/${appId}/users/${userId}/projects`;
        try {
            await addDoc(collection(db, projectsPath), {
                ...newProjectData,
                clientBudget: parseFloat(newProjectData.clientBudget) || null,
                createdAt: serverTimestamp(),
            });
            setNewProjectData({ name: "", description: "", clientName: "", address: "", clientBudget: "", sourceOfEnquiry: "" });
            setIsAddProjectModalOpen(false);
        } catch (error) {
            console.error("Error adding project:", error);
        }
    };

    const handleSelectProject = (projectId) => {
        setSelectedProjectId(projectId);
        setCurrentView('projects');
    };
    const handleGoHome = () => {
        setSelectedProjectId(null);
        setCurrentView('projects');
    };

    const navigateTo = (view) => {
        if (view !== 'projects') setSelectedProjectId(null);
        setCurrentView(view);
    }


    const toggleDarkMode = () => {
        setIsDarkMode(prevMode => {
            const newMode = !prevMode;
            document.documentElement.classList.toggle('dark', newMode);
            return newMode;
        });
    };

    if (!isAuthReady) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center">
                <LoadingSpinner />
                <p className="mt-4 text-gray-600 dark:text-gray-300">Initializing Site Book...</p>
            </div>
        );
    }

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col transition-colors duration-300`}>
            <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('projects')}>
                        <Building size={28} className="text-indigo-600 dark:text-indigo-400" />
                        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Site Book</h1>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        {userId && <span className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">UID: {userId}</span>}

                        <Button onClick={() => navigateTo('companyProfile')} variant="secondary" className="text-sm">
                            <Settings size={16} className="mr-1 hidden sm:inline" /> Company
                        </Button>
                        <Button onClick={() => navigateTo('scheduleRates')} variant="secondary" className="text-sm">
                            <ListOrdered size={16} className="mr-1 hidden sm:inline" /> Rates
                        </Button>
                        {currentView !== 'projects' || selectedProjectId ? (
                            <Button onClick={handleGoHome} variant="secondary" className="text-sm">
                                <Briefcase size={16} className="mr-1 hidden sm:inline" /> Projects
                            </Button>
                        ) : null}


                        <button onClick={toggleDarkMode} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-xl">
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-2 sm:px-4 py-6">
                {currentView === 'projects' && (
                    !selectedProjectId ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">My Projects</h2>
                                <Button onClick={() => setIsAddProjectModalOpen(true)}>
                                    <Plus size={18} className="mr-1" /> Add Project
                                </Button>
                            </div>
                            {isLoadingProjects ? <LoadingSpinner /> : (projects || []).length === 0 ? (
                                <EmptyState message="No projects yet. Click 'Add Project' to get started." icon={<Briefcase size={48} />} />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {(projects || []).map(project => (
                                        <div key={project.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => handleSelectProject(project.id)}>
                                            <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-2 truncate">{project.name}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1"><strong className="font-medium">Client:</strong> {project.clientName || "N/A"}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 h-10 overflow-hidden text-ellipsis">{project.description || "No description"}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">Created: {formatDate(project.createdAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Modal isOpen={isAddProjectModalOpen} onClose={() => setIsAddProjectModalOpen(false)} title="Add New Project" size="lg">
                                <form onSubmit={handleAddProject}>
                                    <Input label="Project Name *" id="addProjectName" name="name" value={newProjectData.name} onChange={handleNewProjectInputChange} placeholder="e.g., Downtown Office Build" required />
                                    <Input label="Client Name" id="addProjectClientName" name="clientName" value={newProjectData.clientName} onChange={handleNewProjectInputChange} placeholder="Client's full name" />
                                    <Textarea label="Address" id="addProjectAddress" name="address" value={newProjectData.address} onChange={handleNewProjectInputChange} placeholder="Project or Client Address" />
                                    <Input label="Client's Budget (₹)" id="addProjectClientBudget" name="clientBudget" type="number" value={newProjectData.clientBudget} onChange={handleNewProjectInputChange} placeholder="e.g., 500000" />
                                    <Input label="Source of Enquiry" id="addProjectSourceOfEnquiry" name="sourceOfEnquiry" value={newProjectData.sourceOfEnquiry} onChange={handleNewProjectInputChange} placeholder="e.g., Referral, Website" />
                                    <Textarea label="Project Description (Optional)" id="addProjectDescription" name="description" value={newProjectData.description} onChange={handleNewProjectInputChange} placeholder="Brief overview of the project" />
                                    <div className="mt-6 flex justify-end gap-3">
                                        <Button type="button" variant="secondary" onClick={() => setIsAddProjectModalOpen(false)}>Cancel</Button>
                                        <Button type="submit" variant="primary" disabled={!newProjectData.name.trim()}>Add Project</Button>
                                    </div>
                                </form>
                            </Modal>
                        </>
                    ) : (
                        selectedProject ? <ProjectDetailView project={selectedProject} userId={userId} /> : <LoadingSpinner />
                    )
                )}

                {currentView === 'scheduleRates' && userId && (
                    <ScheduleRatesView userId={userId} />
                )}
                {currentView === 'companyProfile' && userId && (
                    <CompanyProfileView userId={userId} />
                )}
            </main>
            <footer className="text-center py-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                Site Book &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
}

// --- Company Profile View Component ---
function CompanyProfileView({ userId }) {
    const [profile, setProfile] = useState({ companyName: '', address: '', contactNumber: '', gstNumber: '', signatureImage: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const companyProfileDocPath = `/artifacts/${appId}/users/${userId}/companyProfile/main`;

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const unsub = onSnapshot(doc(db, companyProfileDocPath), (docSnap) => {
            if (docSnap.exists()) {
                setProfile(docSnap.data());
            } else {
                setProfile({ companyName: '', address: '', contactNumber: '', gstNumber: '', signatureImage: '' });
                setIsEditing(true);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching company profile:", error);
            setIsLoading(false);
        });
        return () => unsub();
    }, [userId, companyProfileDocPath]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!userId) return;
        setIsLoading(true);
        try {
            await setDoc(doc(db, companyProfileDocPath), profile, { merge: true });
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving company profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Company Profile</h2>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} variant="secondary">
                        <Edit3 size={16} className="mr-2" /> Edit Profile
                    </Button>
                )}
            </div>

            {isEditing ? (
                <form onSubmit={handleSaveProfile}>
                    <Input label="Company Name" id="companyName" name="companyName" value={profile.companyName} onChange={handleInputChange} placeholder="Your Company Pvt. Ltd." required />
                    <Textarea label="Company Address" id="address" name="address" value={profile.address} onChange={handleInputChange} placeholder="Full company address" rows={3} />
                    <Input label="Contact Number" id="contactNumber" name="contactNumber" type="tel" value={profile.contactNumber} onChange={handleInputChange} placeholder="+91-XXXXXXXXXX" />
                    <Input label="GST Number" id="gstNumber" name="gstNumber" value={profile.gstNumber} onChange={handleInputChange} placeholder="Your company's GSTIN" />
                    <Input label="Signature Image URL (Optional)" id="signatureImage" name="signatureImage" type="url" value={profile.signatureImage} onChange={handleInputChange} placeholder="https://example.com/signature.png" />
                    <div className="mt-6 flex gap-3">
                        <Button type="submit" variant="primary" disabled={isLoading}>Save Profile</Button>
                        {profile.companyName && <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} disabled={isLoading}>Cancel</Button>}
                    </div>
                </form>
            ) : (
                <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p><strong className="font-medium text-gray-900 dark:text-white">Company Name:</strong> {profile.companyName || "Not set"}</p>
                    <p className="whitespace-pre-wrap"><strong className="font-medium text-gray-900 dark:text-white">Address:</strong> {profile.address || "Not set"}</p>
                    <p><strong className="font-medium text-gray-900 dark:text-white">Contact Number:</strong> {profile.contactNumber || "Not set"}</p>
                    <p><strong className="font-medium text-gray-900 dark:text-white">GST Number:</strong> {profile.gstNumber || "Not set"}</p>
                    {profile.signatureImage && <div><strong className="font-medium text-gray-900 dark:text-white">Signature:</strong><img src={profile.signatureImage} alt="Company Signature" className="max-w-xs mt-1 border dark:border-gray-600 rounded" /></div>}
                </div>
            )}
        </div>
    );
}


// --- Schedule Rates View Component ---
function ScheduleRatesView({ userId }) {
    const [scheduleRates, setScheduleRates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const scheduleRatesPath = `/artifacts/${appId}/users/${userId}/scheduleRates`;

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const q = query(collection(db, scheduleRatesPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setScheduleRates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching schedule rates:", error);
            setIsLoading(false);
            setScheduleRates([]);
        });
        return () => unsubscribe();
    }, [userId, scheduleRatesPath]);

    const filteredRates = (scheduleRates || []).filter(rate => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const itemNameMatch = rate.itemName && rate.itemName.toLowerCase().includes(lowerSearchTerm);
        const descriptionMatch = rate.description && rate.description.toLowerCase().includes(lowerSearchTerm);
        const unitMatch = rate.unit && rate.unit.toLowerCase().includes(lowerSearchTerm);
        const rateMatch = rate.rate !== undefined && String(rate.rate).toLowerCase().includes(lowerSearchTerm);
        return itemNameMatch || descriptionMatch || unitMatch || rateMatch;
    });


    return (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-2 sm:p-6">
            <div className="mb-4">
                <Input
                    label="Search Schedule Rates"
                    id="scheduleRateSearch"
                    type="text"
                    placeholder="Search by item, unit, rate, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<Search size={16} className="text-gray-400 dark:text-gray-500" />}
                />
            </div>
            <GenericCrudTab
                title="Schedule of Rates"
                items={filteredRates}
                collectionPath={scheduleRatesPath}
                formFields={[
                    { name: 'itemName', label: 'Item Name/Activity', type: 'text', required: true, placeholder: "e.g., Brickwork (9 inch)" },
                    { name: 'unit', label: 'Unit', type: 'text', required: true, placeholder: "e.g., sqm, cum, nos, RM" },
                    { name: 'rate', label: 'Rate', type: 'number', required: true, placeholder: "e.g., 1200.50" },
                    { name: 'description', label: 'Description (Optional)', type: 'textarea', placeholder: "Additional details or specifications" },
                ]}
                displayColumns={[
                    { header: 'Item/Activity', accessor: 'itemName' },
                    { header: 'Unit', accessor: 'unit' },
                    { header: 'Rate', accessor: 'rate', render: (val) => formatCurrency(val) },
                    { header: 'Description', accessor: 'description' },
                ]}
                emptyMessage={searchTerm ? "No rates match your search." : "No schedule rates defined yet. Add standard rates for your activities."}
                emptyIcon={<ListOrdered size={48} />}
                isLoading={isLoading}
            />
        </div>
    );
}


// --- Project Detail View & Tabs ---
const TABS = [
    { id: 'details', name: 'Details & Docs', icon: <FileText size={18} /> },
    { id: 'invoices', name: 'Invoices', icon: <ClipboardList size={18} /> },
    { id: 'expenses', name: 'Expenses', icon: <Coins size={18} /> },
    { id: 'materials', name: 'Materials', icon: <Archive size={18} /> },
    { id: 'projectUsers', name: 'Project Users', icon: <Users size={18} /> },
];

function ProjectDetailView({ project, userId }) {
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const [tabSpecificData, setTabSpecificData] = useState({});
    const [isLoadingTabData, setIsLoadingTabData] = useState({});

    const [projectInvoices, setProjectInvoices] = useState([]);
    const [isLoadingSharedData, setIsLoadingSharedData] = useState(true);

    const [isGenerateInvoiceModalOpen, setIsGenerateInvoiceModalOpen] = useState(false);
    const [selectedInvoiceForGeneration, setSelectedInvoiceForGeneration] = useState(null);

    const [isAddEditInvoiceModalOpen, setIsAddEditInvoiceModalOpen] = useState(false);
    const [editingInvoiceData, setEditingInvoiceData] = useState(null);

    const [isDetailedAckModalOpen, setIsDetailedAckModalOpen] = useState(false);
    const [selectedInvoiceForDetailedAck, setSelectedInvoiceForDetailedAck] = useState(null);


    const [isAcknowledgeLabourPaymentModalOpen, setIsAcknowledgeLabourPaymentModalOpen] = useState(false);
    const [selectedLabourPaymentForAck, setSelectedLabourPaymentForAck] = useState(null);
    const [projectUsers, setProjectUsers] = useState([]);


    const basePath = `/artifacts/${appId}/users/${userId}/projects/${project.id}`;
    const invoicesPath = `${basePath}/clientInvoices`;
    const projectUsersPath = `${basePath}/projectUsers`;

    useEffect(() => {
        if (!userId || !project || !project.id) {
            setIsLoadingSharedData(false);
            return;
        }
        setIsLoadingSharedData(true);
        let invoiceUnsub, usersUnsub;

        invoiceUnsub = onSnapshot(query(collection(db, invoicesPath)), (snapshot) => {
            setProjectInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Error fetching invoices:", error);
            setProjectInvoices([]);
        });

        usersUnsub = onSnapshot(query(collection(db, projectUsersPath)), (snapshot) => {
            setProjectUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Error fetching project users:", error);
            setProjectUsers([]);
        });

        Promise.allSettled([
            getDocs(query(collection(db, invoicesPath))),
            getDocs(query(collection(db, projectUsersPath)))
        ]).finally(() => {
            setIsLoadingSharedData(false);
        });

        return () => {
            if (invoiceUnsub) invoiceUnsub();
            if (usersUnsub) usersUnsub();
        };
    }, [userId, project, basePath, invoicesPath, projectUsersPath]);

    const fetchDataForActiveTab = useCallback(async (tabId) => {
        if (!userId || !project || !project.id) {
            setIsLoadingTabData(prev => ({ ...prev, [tabId]: false }));
            return;
        }
        if (['invoices', 'materials', 'expenses', 'projectUsers'].includes(tabId)) {
            setTabSpecificData(prev => ({ ...prev, [tabId]: [] }));
            setIsLoadingTabData(prev => ({ ...prev, [tabId]: false }));
            return;
        }

        setIsLoadingTabData(prev => ({ ...prev, [tabId]: true }));
        let collectionPath = '';
        switch (tabId) {
            case 'details': collectionPath = `${basePath}/documents`; break;
            default:
                setIsLoadingTabData(prev => ({ ...prev, [tabId]: false }));
                return;
        }

        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTabSpecificData(prev => ({ ...prev, [tabId]: items }));
            setIsLoadingTabData(prev => ({ ...prev, [tabId]: false }));
        }, (error) => {
            console.error(`Error fetching ${tabId}:`, error);
            setTabSpecificData(prev => ({ ...prev, [tabId]: [] }));
            setIsLoadingTabData(prev => ({ ...prev, [tabId]: false }));
        });
        return unsubscribe;
    }, [userId, project, basePath]);

    useEffect(() => {
        let unsubscribe;
        unsubscribe = fetchDataForActiveTab(activeTab);
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [activeTab, fetchDataForActiveTab]);

    const handleOpenGenerateInvoiceModal = (invoiceData) => {
        setSelectedInvoiceForGeneration(invoiceData);
        setIsGenerateInvoiceModalOpen(true);
    };

    const handleOpenAddEditInvoiceModal = (invoiceToEdit = null) => {
        setEditingInvoiceData(invoiceToEdit);
        setIsAddEditInvoiceModalOpen(true);
    };

    const handleSaveInvoice = async (invoiceDetails) => {
        try {
            if (editingInvoiceData && editingInvoiceData.id) {
                const invoiceDocRef = doc(db, invoicesPath, editingInvoiceData.id);
                await updateDoc(invoiceDocRef, { ...invoiceDetails, updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, invoicesPath), { ...invoiceDetails, createdAt: serverTimestamp() });
            }
            setIsAddEditInvoiceModalOpen(false);
            setEditingInvoiceData(null);
        } catch (error) {
            console.error("Error saving invoice:", error);
        }
    };

    const handleDeleteInvoice = async (invoiceId) => {
        if (window.confirm("Are you sure you want to delete this invoice?")) {
            try {
                await deleteDoc(doc(db, invoicesPath, invoiceId));
            } catch (error) {
                console.error("Error deleting invoice:", error);
            }
        }
    };

    const handleOpenDetailedAckModal = (invoice) => {
        setSelectedInvoiceForDetailedAck(invoice);
        setIsDetailedAckModalOpen(true);
    };

    const handleOpenLabourAckModal = (payment) => {
        setSelectedLabourPaymentForAck(payment);
        setIsAcknowledgeLabourPaymentModalOpen(true);
    }


    const renderTabContent = () => {
        const currentTabData = tabSpecificData[activeTab] || [];
        const tabIsLoading = isLoadingTabData[activeTab] || false;

        if ((activeTab === 'invoices' || activeTab === 'projectUsers' || activeTab === 'expenses') && isLoadingSharedData) {
            return <LoadingSpinner />;
        }
        if (activeTab === 'details' && tabIsLoading) {
            return <LoadingSpinner />;
        }

        switch (activeTab) {
            case 'details':
                return <ProjectInfoTab project={project} documents={currentTabData} basePath={basePath} userId={userId} />;
            case 'invoices':
                return <InvoiceDisplayTab
                    projectInvoices={projectInvoices}
                    isLoadingInvoices={isLoadingSharedData}
                    onAddNewInvoice={() => handleOpenAddEditInvoiceModal(null)}
                    onEditInvoice={handleOpenAddEditInvoiceModal}
                    onDeleteInvoice={handleDeleteInvoice}
                    onGenerateInvoice={handleOpenGenerateInvoiceModal}
                    onAcknowledgePayment={handleOpenDetailedAckModal}
                />;
            case 'expenses':
                return <ExpensesTab
                    project={project}
                    basePath={basePath}
                    userId={userId}
                    projectUsers={projectUsers}
                    onAcknowledgeLabourPayment={handleOpenLabourAckModal}
                />;
            case 'materials':
                return <MaterialsTab project={project} basePath={basePath} userId={userId} />;
            case 'projectUsers':
                return <GenericCrudTab
                    title="Project Users"
                    items={projectUsers}
                    collectionPath={projectUsersPath}
                    formFields={[
                        { name: 'name', label: 'Name', type: 'text', required: true },
                        { name: 'role', label: 'Role (e.g., Plumber, Electrician)', type: 'text', required: true },
                        { name: 'phone', label: 'Phone Number', type: 'tel' },
                        { name: 'email', label: 'Email Address', type: 'email' },
                    ]}
                    displayColumns={[
                        { header: 'Name', accessor: 'name' },
                        { header: 'Role', accessor: 'role' },
                        { header: 'Phone', accessor: 'phone', render: (phone) => phone ? <a href={`tel:${phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{phone}</a> : 'N/A' },
                        { header: 'Email', accessor: 'email', render: (email) => email ? <a href={`mailto:${email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{email}</a> : 'N/A' },
                    ]}
                    emptyMessage="No project users added yet."
                    emptyIcon={<Users size={32} />}
                    isLoading={isLoadingSharedData}
                />;
            default:
                return <EmptyState message="Select a tab to view content." icon={<FileText size={48} />} />;
        }
    };

    if (!project) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Project not found or loading...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-2 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{project.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1"><strong className="font-medium">Client:</strong> {project.clientName || "N/A"}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1"><strong className="font-medium">Address:</strong> {project.address || "N/A"}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1"><strong className="font-medium">Client Budget (₹):</strong> {project.clientBudget ? formatCurrency(project.clientBudget) : "N/A"}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1"><strong className="font-medium">Source of Enquiry:</strong> {project.sourceOfEnquiry || "N/A"}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 whitespace-pre-wrap"><strong className="font-medium">Project Description:</strong> {project.description || "No description provided."}</p>

            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto pb-1" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap flex items-center gap-1 sm:gap-2 py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-150
                ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                                }`}
                        >
                            {tab.icon} <span className="hidden sm:inline">{tab.name}</span><span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div>{renderTabContent()}</div>

            {isAddEditInvoiceModalOpen && (
                <AddEditInvoiceModal
                    isOpen={isAddEditInvoiceModalOpen}
                    onClose={() => {
                        setIsAddEditInvoiceModalOpen(false);
                        setEditingInvoiceData(null);
                    }}
                    project={project}
                    userId={userId}
                    existingInvoiceData={editingInvoiceData}
                    onSave={handleSaveInvoice}
                />
            )}

            {selectedInvoiceForGeneration && (
                <GenerateInvoiceModal
                    isOpen={isGenerateInvoiceModalOpen}
                    onClose={() => {
                        setIsGenerateInvoiceModalOpen(false);
                        setSelectedInvoiceForGeneration(null);
                    }}
                    invoiceData={selectedInvoiceForGeneration}
                    projectDetails={project}
                    userId={userId}
                />
            )}

            {isDetailedAckModalOpen && selectedInvoiceForDetailedAck && (
                <DetailedPaymentAcknowledgementModal
                    isOpen={isDetailedAckModalOpen}
                    onClose={() => {
                        setIsDetailedAckModalOpen(false);
                        setSelectedInvoiceForDetailedAck(null);
                    }}
                    invoice={selectedInvoiceForDetailedAck}
                    project={project}
                    userId={userId}
                />
            )}

            {isAcknowledgeLabourPaymentModalOpen && selectedLabourPaymentForAck && (
                <AcknowledgeLabourPaymentModal
                    isOpen={isAcknowledgeLabourPaymentModalOpen}
                    onClose={() => {
                        setIsAcknowledgeLabourPaymentModalOpen(false);
                        setSelectedLabourPaymentForAck(null);
                    }}
                    payment={selectedLabourPaymentForAck}
                    projectUsers={projectUsers}
                    project={project}
                />
            )}
        </div>
    );
}

// --- Expenses Tab ---
function ExpensesTab({ project, basePath, userId, projectUsers, onAcknowledgeLabourPayment }) {
    const [activeSubTab, setActiveSubTab] = useState('labour');

    const labourPaymentsPath = `${basePath}/labourPayments`;
    const siteExpensesPath = `${basePath}/siteExpenses`;
    const miscExpensesPath = `${basePath}/miscExpenses`;

    const [labourPayments, setLabourPayments] = useState([]);
    const [siteExpenses, setSiteExpenses] = useState([]);
    const [miscExpenses, setMiscExpenses] = useState([]);
    const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
    const [isLoadingLabourPayments, setIsLoadingLabourPayments] = useState(true);


    useEffect(() => {
        setIsLoadingLabourPayments(true);
        const unsubLabour = onSnapshot(query(collection(db, labourPaymentsPath)), snap => {
            setLabourPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoadingLabourPayments(false);
        }, err => { setIsLoadingLabourPayments(false); console.error("Error fetching labour payments:", err); setLabourPayments([]) });

        const unsubSite = onSnapshot(query(collection(db, siteExpensesPath)), snap => setSiteExpenses(snap.docs.map(d => d.data())),
            err => { console.error("Error fetching site expenses:", err); setSiteExpenses([]) });
        const unsubMisc = onSnapshot(query(collection(db, miscExpensesPath)), snap => setMiscExpenses(snap.docs.map(d => d.data())),
            err => { console.error("Error fetching misc expenses:", err); setMiscExpenses([]) });

        Promise.allSettled([
            getDocs(query(collection(db, siteExpensesPath))),
            getDocs(query(collection(db, miscExpensesPath))),
        ]).finally(() => setIsLoadingSummaries(false));

        return () => { unsubLabour(); unsubSite(); unsubMisc(); };
    }, [labourPaymentsPath, siteExpensesPath, miscExpensesPath]);

    const totalLabourCost = (labourPayments || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalSiteExpenses = (siteExpenses || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalMiscExpenses = (miscExpenses || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const grandTotalExpenses = totalLabourCost + totalSiteExpenses + totalMiscExpenses;


    return (
        <div className="space-y-6">
            <div className="p-3 bg-red-100 dark:bg-red-700 rounded-md text-center text-red-700 dark:text-red-100 font-semibold shadow">
                Total Expenses: {isLoadingSummaries || isLoadingLabourPayments ? 'Loading...' : formatCurrency(grandTotalExpenses)}
            </div>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => setActiveSubTab('labour')} className={`px-4 py-2 font-medium text-sm ${activeSubTab === 'labour' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Labour Payments</button>
                <button onClick={() => setActiveSubTab('site')} className={`px-4 py-2 font-medium text-sm ${activeSubTab === 'site' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Site Expenses</button>
                <button onClick={() => setActiveSubTab('misc')} className={`px-4 py-2 font-medium text-sm ${activeSubTab === 'misc' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Miscellaneous</button>
            </div>

            {activeSubTab === 'labour' && (
                <GenericCrudTab
                    title="Labour Payments"
                    items={labourPayments}
                    collectionPath={labourPaymentsPath}
                    formFields={[
                        { name: 'labourerId', label: 'Select Labourer', type: 'select', options: (projectUsers || []).map(c => ({ value: c.id, label: `${c.name} (${c.role || 'N/A'})` })), specialType: 'labourerSelect', required: true },
                        { name: 'amount', label: 'Amount Paid', type: 'number', required: true },
                        { name: 'paymentDate', label: 'Payment Date', type: 'date', required: true },
                        { name: 'notes', label: 'Notes/Details', type: 'textarea' },
                    ]}
                    displayColumns={[
                        { header: 'Labourer', accessor: 'labourerId', render: (id) => (projectUsers || []).find(c => c.id === id)?.name || id || 'N/A' },
                        { header: 'Role', accessor: 'labourerId', render: (id) => (projectUsers || []).find(c => c.id === id)?.role || 'N/A' },
                        { header: 'Amount', accessor: 'amount', render: (val) => formatCurrency(val) },
                        { header: 'Date', accessor: 'paymentDate', render: formatDate },
                        { header: 'Notes', accessor: 'notes' },
                    ]}
                    emptyMessage="No labour payments recorded."
                    emptyIcon={<Users size={32} />}
                    isLoading={isLoadingLabourPayments || isLoadingSharedData}
                    customActions={(item) => (
                        <IconButton
                            onClick={() => onAcknowledgeLabourPayment(item)}
                            icon={<DollarSign size={16} />}
                            tooltip="Acknowledge Payment"
                            className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        />
                    )}
                />
            )}
            {activeSubTab === 'site' && (
                <GenericCrudTab
                    title="Site Expenses"
                    collectionPath={siteExpensesPath}
                    formFields={[
                        { name: 'expenseTitle', label: 'Expense Title/Description', type: 'text', required: true },
                        { name: 'amount', label: 'Amount', type: 'number', required: true },
                        { name: 'expenseDate', label: 'Date of Expense', type: 'date', required: true },
                        { name: 'category', label: 'Category (Optional)', type: 'text', placeholder: "e.g., Transport, Fuel, Permits" },
                        { name: 'notes', label: 'Notes', type: 'textarea' },
                    ]}
                    displayColumns={[
                        { header: 'Title', accessor: 'expenseTitle' },
                        { header: 'Amount', accessor: 'amount', render: (val) => formatCurrency(val) },
                        { header: 'Date', accessor: 'expenseDate', render: formatDate },
                        { header: 'Category', accessor: 'category' },
                        { header: 'Notes', accessor: 'notes' },
                    ]}
                    emptyMessage="No site expenses recorded."
                    emptyIcon={<Construction size={32} />}
                    isLoading={isLoadingSummaries}
                />
            )}
            {activeSubTab === 'misc' && (
                <GenericCrudTab
                    title="Miscellaneous Expenses"
                    collectionPath={miscExpensesPath}
                    formFields={[
                        { name: 'description', label: 'Description', type: 'text', required: true },
                        { name: 'amount', label: 'Amount', type: 'number', required: true },
                        { name: 'expenseDate', label: 'Date', type: 'date', required: true },
                        { name: 'notes', label: 'Notes (Optional)', type: 'textarea' },
                    ]}
                    displayColumns={[
                        { header: 'Description', accessor: 'description' },
                        { header: 'Amount', accessor: 'amount', render: (val) => formatCurrency(val) },
                        { header: 'Date', accessor: 'expenseDate', render: formatDate },
                        { header: 'Notes', accessor: 'notes' },
                    ]}
                    emptyMessage="No miscellaneous expenses recorded."
                    emptyIcon={<Info size={32} />}
                    isLoading={isLoadingSummaries}
                />
            )}
        </div>
    );
}


// --- Materials Tab (New) ---
function MaterialsTab({ project, basePath, userId }) {
    const [materialsProcuredData, setMaterialsProcuredData] = useState([]);
    const [materialsIndentData, setMaterialsIndentData] = useState([]);
    const [isLoadingProcured, setIsLoadingProcured] = useState(true);
    const [isLoadingIndent, setIsLoadingIndent] = useState(true);

    const procuredPath = `${basePath}/materialsProcured`;
    const indentPath = `${basePath}/materialsIndent`;

    useEffect(() => {
        setIsLoadingProcured(true);
        const unsubProcured = onSnapshot(query(collection(db, procuredPath)), (snapshot) => {
            setMaterialsProcuredData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoadingProcured(false);
        }, (err) => {
            console.error("Error fetching procured materials:", err);
            setIsLoadingProcured(false);
            setMaterialsProcuredData([]);
        });

        setIsLoadingIndent(true);
        const unsubIndent = onSnapshot(query(collection(db, indentPath)), (snapshot) => {
            setMaterialsIndentData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoadingIndent(false);
        }, (err) => {
            console.error("Error fetching indent materials:", err);
            setIsLoadingIndent(false);
            setMaterialsIndentData([]);
        });

        return () => {
            unsubProcured();
            unsubIndent();
        };
    }, [basePath]);

    const totalMaterialsCost = (materialsProcuredData || []).reduce((sum, item) => sum + parseFloat(item.cost || 0), 0);

    return (
        <div className="space-y-8">
            <div className="p-3 bg-blue-100 dark:bg-gray-700 rounded-md text-center text-blue-700 dark:text-blue-100 font-semibold shadow">
                Total Materials Procured Cost: {isLoadingProcured ? 'Loading...' : formatCurrency(totalMaterialsCost)}
            </div>

            <section key="materials-procured-section-in-materials-tab">
                <GenericCrudTab
                    title="Materials Procured"
                    items={materialsProcuredData}
                    collectionPath={procuredPath}
                    formFields={[
                        { name: 'itemName', label: 'Item Name', type: 'text', required: true },
                        { name: 'quantity', label: 'Quantity', type: 'number', required: true },
                        { name: 'unit', label: 'Unit (e.g., kg, pcs)', type: 'text', required: true },
                        { name: 'cost', label: 'Total Cost', type: 'number', required: true },
                        { name: 'supplier', label: 'Supplier', type: 'text' },
                        { name: 'date', label: 'Procurement Date', type: 'date', required: true },
                    ]}
                    displayColumns={[
                        { header: 'Item', accessor: 'itemName' },
                        { header: 'Qty', accessor: 'quantity' },
                        { header: 'Unit', accessor: 'unit' },
                        { header: 'Cost', accessor: 'cost', render: (val) => formatCurrency(val) },
                        { header: 'Supplier', accessor: 'supplier' },
                        { header: 'Date', accessor: 'date', render: formatDate },
                    ]}
                    emptyMessage="No procured materials recorded yet."
                    emptyIcon={<ShoppingCart size={32} />}
                    isLoading={isLoadingProcured}
                />
            </section>

            <section key="materials-indent-section-in-materials-tab">
                <GenericCrudTab
                    title="Materials Indent"
                    items={materialsIndentData}
                    collectionPath={indentPath}
                    formFields={[
                        { name: 'itemName', label: 'Item Name', type: 'text', required: true },
                        { name: 'quantityRequested', label: 'Quantity Requested', type: 'number', required: true },
                        { name: 'unit', label: 'Unit', type: 'text', required: true },
                        { name: 'dateRequested', label: 'Date Requested', type: 'date', required: true },
                        { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Procured', 'Rejected'], required: true },
                        { name: 'notes', label: 'Notes', type: 'textarea' },
                    ]}
                    displayColumns={[
                        { header: 'Item', accessor: 'itemName' },
                        { header: 'Qty Req.', accessor: 'quantityRequested' },
                        { header: 'Unit', accessor: 'unit' },
                        { header: 'Date Req.', accessor: 'dateRequested', render: formatDate },
                        {
                            header: 'Status', accessor: 'status', render: (status) => (
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status === 'Approved' || status === 'Procured' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                                        status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100' :
                                            'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>{status}</span>
                            )
                        },
                        { header: 'Notes', accessor: 'notes' },
                    ]}
                    emptyMessage="No material indents recorded yet."
                    emptyIcon={<Briefcase size={32} />}
                    isLoading={isLoadingIndent}
                />
            </section>
        </div>
    );
}


// --- Specific Tab Components (Details, Acknowledgement) ---

function ProjectInfoTab({ project, documents, basePath, userId }) {
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editData, setEditData] = useState({
        name: project.name || "",
        description: project.description || "",
        clientName: project.clientName || "",
        address: project.address || "",
        clientBudget: project.clientBudget || "",
        sourceOfEnquiry: project.sourceOfEnquiry || ""
    });

    const [isAiLoading, setIsAiLoading] = useState(false);

    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [docFormData, setDocFormData] = useState({ fileName: '', fileType: '', driveLink: '', notes: '' });
    const [editingDoc, setEditingDoc] = useState(null);

    const projectDocPath = `/artifacts/${appId}/users/${userId}/projects/${project.id}`;
    const documentsCollectionPath = `${basePath}/documents`;

    useEffect(() => {
        setEditData({
            name: project.name || "",
            description: project.description || "",
            clientName: project.clientName || "",
            address: project.address || "",
            clientBudget: project.clientBudget || "",
            sourceOfEnquiry: project.sourceOfEnquiry || ""
        });
    }, [project]);

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    }


    const handleUpdateProjectDetails = async (e) => {
        e.preventDefault();
        if (!editData.name.trim()) return;
        try {
            await updateDoc(doc(db, projectDocPath), {
                ...editData,
                clientBudget: parseFloat(editData.clientBudget) || null,
                updatedAt: serverTimestamp()
            });
            setIsEditingProject(false);
        } catch (error) {
            console.error("Error updating project details:", error);
        }
    };

    const openDocModal = (docToEdit = null) => {
        if (docToEdit) {
            setEditingDoc(docToEdit);
            setDocFormData({ fileName: docToEdit.fileName, fileType: docToEdit.fileType, driveLink: docToEdit.driveLink, notes: docToEdit.notes || '' });
        } else {
            setEditingDoc(null);
            setDocFormData({ fileName: '', fileType: '', driveLink: '', notes: '' });
        }
        setIsDocModalOpen(true);
    };

    const handleDocSubmit = async (e) => {
        e.preventDefault();
        if (!docFormData.fileName.trim()) return;
        const dataToSave = { ...docFormData, updatedAt: serverTimestamp() };
        try {
            if (editingDoc) {
                await updateDoc(doc(db, documentsCollectionPath, editingDoc.id), dataToSave);
            } else {
                await addDoc(collection(db, documentsCollectionPath), { ...dataToSave, createdAt: serverTimestamp() });
            }
            setIsDocModalOpen(false);
        } catch (error) {
            console.error("Error saving document:", error);
        }
    };

    const handleDeleteDoc = async (docId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this document link?");
        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, documentsCollectionPath, docId));
            } catch (error) {
                console.error("Error deleting document:", error);
            }
        }
    };

    const handleEnhanceDescription = async () => {
        setIsAiLoading(true);
        const prompt = `Enhance the following project description for a construction project named "${editData.name}". Current description: "${editData.description}". Make it more detailed and professional. If the current description is empty, create a suitable one based on the project name.`;
        try {
            const enhancedDescription = await callGeminiAPI(prompt);
            setEditData(prev => ({ ...prev, description: enhancedDescription }));
        } catch (error) {
            console.error("Failed to enhance description.");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Project Information</h3>
                    <IconButton onClick={() => setIsEditingProject(!isEditingProject)} icon={isEditingProject ? <X size={20} /> : <Edit3 size={20} />} tooltip={isEditingProject ? "Cancel Edit" : "Edit Project Details"} />
                </div>
                {isEditingProject ? (
                    <form onSubmit={handleUpdateProjectDetails}>
                        <Input label="Project Name *" id="editProjectName" name="name" value={editData.name} onChange={handleEditInputChange} required />
                        <Input label="Client Name" id="editProjectClientName" name="clientName" value={editData.clientName} onChange={handleEditInputChange} />
                        <Textarea label="Address" id="editProjectAddress" name="address" value={editData.address} onChange={handleEditInputChange} rows={2} />
                        <Input label="Client's Budget (₹)" id="editProjectClientBudget" name="clientBudget" type="number" value={editData.clientBudget} onChange={handleEditInputChange} placeholder="Enter amount" />
                        <Input label="Source of Enquiry" id="editProjectSourceOfEnquiry" name="sourceOfEnquiry" value={editData.sourceOfEnquiry} onChange={handleEditInputChange} />
                        <div className="relative group">
                            <Textarea
                                label="Project Description"
                                id="editProjectDesc"
                                name="description"
                                value={editData.description}
                                onChange={handleEditInputChange}
                                disabled={isAiLoading}
                                rows={5}
                            />
                            <div className="absolute top-0 right-0 mt-0">
                                <Button
                                    type="button"
                                    variant="ai"
                                    onClick={handleEnhanceDescription}
                                    disabled={isAiLoading}
                                    className="text-xs px-2 py-1"
                                >
                                    {isAiLoading ? <LoadingSpinner small={true} /> : <Sparkles size={14} className="mr-1" />} Enhance ✨
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Button type="submit" variant="primary" disabled={isAiLoading}>Save Changes</Button>
                            <Button type="button" variant="secondary" onClick={() => setIsEditingProject(false)} disabled={isAiLoading}>Cancel</Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <p><strong className="font-medium text-gray-800 dark:text-gray-100">Project Name:</strong> {project.name}</p>
                        <p><strong className="font-medium text-gray-800 dark:text-gray-100">Client Name:</strong> {project.clientName || "N/A"}</p>
                        <p><strong className="font-medium text-gray-800 dark:text-gray-100">Address:</strong> {project.address || "N/A"}</p>
                        <p><strong className="font-medium text-gray-800 dark:text-gray-100">Client's Budget (₹):</strong> {project.clientBudget ? formatCurrency(project.clientBudget) : "N/A"}</p>
                        <p><strong className="font-medium text-gray-800 dark:text-gray-100">Source of Enquiry:</strong> {project.sourceOfEnquiry || "N/A"}</p>
                        <div className="whitespace-pre-wrap"><strong className="font-medium text-gray-800 dark:text-gray-100">Description:</strong> {project.description || "N/A"}</div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400"><strong className="font-medium">Created:</strong> {formatDate(project.createdAt)}</p>
                        {project.updatedAt && <p className="text-xs text-gray-500 dark:text-gray-400"><strong className="font-medium">Last Updated:</strong> {formatDate(project.updatedAt)}</p>}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Project Documents</h3>
                <Button onClick={() => openDocModal()} variant="primary"><Plus size={18} /> Add Document Link</Button>
            </div>
            {(documents || []).length === 0 ? (
                <EmptyState message="No documents linked yet. Add links to your Google Drive or other cloud storage." icon={<FileText size={32} />} />
            ) : (
                <div className="space-y-3">
                    {(documents || []).map(docItem => (
                        <div key={docItem.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-md flex flex-col sm:flex-row justify-between sm:items-start">
                            <div className="flex-grow mb-2 sm:mb-0">
                                <h4 className="font-medium text-gray-800 dark:text-gray-100">{docItem.fileName}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{docItem.fileType || 'N/A'}</p>
                                {docItem.driveLink && (
                                    <a href={docItem.driveLink} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 break-all">
                                        Open Link <ExternalLink size={14} />
                                    </a>
                                )}
                                {docItem.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Notes: {docItem.notes}</p>}
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Last Updated: {formatDate(docItem.updatedAt)}</p>
                            </div>
                            <div className="flex gap-1 self-start sm:self-center">
                                <IconButton onClick={() => openDocModal(docItem)} icon={<Edit3 size={18} />} tooltip="Edit Document Link" />
                                <IconButton onClick={() => handleDeleteDoc(docItem.id)} icon={<Trash2 size={18} />} tooltip="Delete Document Link" className="text-red-500 hover:text-red-700 dark:hover:text-red-400" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} title={editingDoc ? "Edit Document Link" : "Add Document Link"}>
                <form onSubmit={handleDocSubmit}>
                    <Input label="File Name" id="docFileName" value={docFormData.fileName} onChange={e => setDocFormData({ ...docFormData, fileName: e.target.value })} required />
                    <Input label="File Type (e.g., PDF, Blueprint)" id="docFileType" value={docFormData.fileType} onChange={e => setDocFormData({ ...docFormData, fileType: e.target.value })} />
                    <Input label="Google Drive Link (or other URL)" id="docDriveLink" type="url" value={docFormData.driveLink} onChange={e => setDocFormData({ ...docFormData, driveLink: e.target.value })} placeholder="https://docs.google.com/..." />
                    <Textarea label="Notes" id="docNotes" value={docFormData.notes} onChange={e => setDocFormData({ ...docFormData, notes: e.target.value })} />
                    <div className="mt-6 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsDocModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">{editingDoc ? "Update" : "Add"} Link</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// --- Detailed Payment Acknowledgement Modal ---
function DetailedPaymentAcknowledgementModal({ isOpen, onClose, invoice, project, userId }) {
    const [companyProfile, setCompanyProfile] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [ackDetails, setAckDetails] = useState({
        amountReceived: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: 'Cash',
        referenceId: '',
        clientEmail: project?.clientEmail || invoice?.clientEmail || '',
        clientWhatsApp: '',
        authorizedSignatory: '',
    });
    const [acknowledgementText, setAcknowledgementText] = useState('');
    const [showCopySuccess, setShowCopySuccess] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const invoicesPath = `/artifacts/${appId}/users/${userId}/projects/${project.id}/clientInvoices`;


    useEffect(() => {
        if (isOpen && userId) {
            setIsLoadingProfile(true);
            const profilePath = `/artifacts/${appId}/users/${userId}/companyProfile/main`;
            const unsub = onSnapshot(doc(db, profilePath), (docSnap) => {
                if (docSnap.exists()) {
                    const profileData = docSnap.data();
                    setCompanyProfile(profileData);
                    setAckDetails(prev => ({ ...prev, authorizedSignatory: profileData.companyName || 'Authorized Signatory' }));
                } else {
                    setCompanyProfile({ companyName: "Your Company Name", address: "Your Address", contactNumber: "Your Contact", gstNumber: "Your GSTIN", signatureImage: "" });
                    setAckDetails(prev => ({ ...prev, authorizedSignatory: 'Authorized Signatory' }));
                }
                setIsLoadingProfile(false);
            }, (error) => {
                console.error("Error fetching company profile for ack:", error);
                setIsLoadingProfile(false);
            });
            return () => unsub();
        }
    }, [isOpen, userId]);

    useEffect(() => {
        if (invoice && companyProfile) {
            const invoiceTotal = calculateInvoiceTotal(invoice);
            const totalAlreadyPaid = (invoice.paymentsReceived || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            const outstandingAmount = invoiceTotal - totalAlreadyPaid;

            setAckDetails(prev => ({
                ...prev,
                amountReceived: formatCurrency(outstandingAmount > 0 ? outstandingAmount : 0),
                clientEmail: project?.clientEmail || invoice?.clientEmail || '',
            }));
        }
    }, [invoice, project, companyProfile, isOpen]);

    useEffect(() => {
        if (invoice && companyProfile) {
            const generatedText = `
${companyProfile.companyName || '[Your Company Name]'}
${companyProfile.address?.replace(/\n/g, '\n') || '[Your Company Address]'}
Contact: ${companyProfile.contactNumber || '[Your Contact]'} | GSTIN: ${companyProfile.gstNumber || '[Your GSTIN]'}
--------------------------------------------------
PAYMENT ACKNOWLEDGEMENT
--------------------------------------------------
Date: ${formatDate(new Date().toISOString().split('T')[0])}

Received From:
${invoice.clientName || project.clientName || 'Valued Client'}
Project: ${project.name}
Invoice No: ${invoice.invoiceNumber}

Dear ${invoice.clientName || project.clientName || 'Sir/Madam'},

This is to acknowledge with thanks the receipt of payment of ₹ ${formatCurrency(ackDetails.amountReceived)} (Rupees ${amountToWords(ackDetails.amountReceived)})
on ${formatDate(ackDetails.paymentDate)} via ${ackDetails.paymentMode} ${ackDetails.referenceId ? `(Ref: ${ackDetails.referenceId})` : ''}
towards Invoice No. ${invoice.invoiceNumber} dated ${formatDate(invoice.issueDate)}.

Thank you for your prompt payment.

For ${companyProfile.companyName || '[Your Company Name]'},

_________________________
(${ackDetails.authorizedSignatory || companyProfile.companyName || 'Authorized Signatory'})
${companyProfile.signatureImage ? `[Signature Image Placeholder: ${companyProfile.signatureImage}]` : ''}
`;
            setAcknowledgementText(generatedText.trim());
        }
    }, [ackDetails, invoice, project, companyProfile]);


    const amountToWords = (amountStr) => {
        const num = parseFloat(amountStr);
        if (isNaN(num)) return '';
        return num.toString();
    };


    const handleAckInputChange = (e) => {
        const { name, value } = e.target;
        setAckDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleGeneratePdfPreview = () => {
        const letterheadStyle = `padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;`;
        const companyHeaderStyle = `text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px;`;
        const companyNameStyle = `font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #2c3e50;`;
        const companyDetailsStyle = `font-size: 12px; color: #555;`;
        const sectionTitleStyle = `font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom:10px; color: #34495e; border-bottom: 1px solid #ddd; padding-bottom: 5px;`;
        const signatureAreaStyle = `margin-top: 50px; border-top: 1px solid #ccc; padding-top:10px; text-align: right;`;
        const signatureImageStyle = `max-height: 60px; max-width: 150px; display: block; margin-left: auto; margin-bottom: 5px;`;

        const content = `
            <html>
            <head><title>Payment Acknowledgement - ${invoice.invoiceNumber}</title></head>
            <body style="${letterheadStyle}">
                <div style="${companyHeaderStyle}">
                    <div style="${companyNameStyle}">${companyProfile?.companyName || '[Your Company Name]'}</div>
                    <div style="${companyDetailsStyle}">${companyProfile?.address?.replace(/\n/g, '<br/>') || '[Your Company Address]'}</div>
                    <div style="${companyDetailsStyle}">Contact: ${companyProfile?.contactNumber || '[Your Contact]'} | GSTIN: ${companyProfile?.gstNumber || '[Your GSTIN]'}</div>
                </div>
                <div style="${sectionTitleStyle}">PAYMENT ACKNOWLEDGEMENT</div>
                <p><strong>Date:</strong> ${formatDate(new Date().toISOString().split('T')[0])}</p>
                <p><strong>Received From:</strong> ${invoice.clientName || project.clientName || 'Valued Client'}</p>
                <p><strong>Project:</strong> ${project.name}</p>
                <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
                <br/>
                <p>Dear ${invoice.clientName || project.clientName || 'Sir/Madam'},</p>
                <p>This is to acknowledge with thanks the receipt of payment of <strong>₹ ${formatCurrency(ackDetails.amountReceived)}</strong> (Rupees ${amountToWords(ackDetails.amountReceived)}) on <strong>${formatDate(ackDetails.paymentDate)}</strong> via <strong>${ackDetails.paymentMode}</strong> ${ackDetails.referenceId ? `(Ref: ${ackDetails.referenceId})` : ''} towards Invoice No. ${invoice.invoiceNumber} dated ${formatDate(invoice.issueDate)}.</p>
                <p>Thank you for your prompt payment.</p>
                <br/>
                <p>For ${companyProfile?.companyName || '[Your Company Name]'}</p>
                <div style="${signatureAreaStyle}">
                    ${companyProfile?.signatureImage ? `<img src="${companyProfile.signatureImage}" alt="Signature" style="${signatureImageStyle}" />` : '<br/><br/><br/>'}
                    ( ${ackDetails.authorizedSignatory || companyProfile?.companyName || 'Authorized Signatory'} )
                </div>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(content);
            win.document.close();
        } else {
            console.error("Failed to open new window for PDF preview. Pop-up blocker might be active.");
        }
    };

    const handleSendEmail = () => {
        const subject = `Payment Acknowledgement - Invoice #${invoice.invoiceNumber} for Project ${project.name}`;
        const body = encodeURIComponent(acknowledgementText);
        window.location.href = `mailto:${ackDetails.clientEmail}?subject=${encodeURIComponent(subject)}&body=${body}`;
    };

    const handleSendWhatsApp = () => {
        let phoneNumber = ackDetails.clientWhatsApp.replace(/\D/g, '');
        const message = encodeURIComponent(acknowledgementText);
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    };

    const handleRecordPayment = async () => {
        if (!invoice || !invoice.id || !ackDetails.amountReceived || parseFloat(ackDetails.amountReceived) <= 0) {
            console.error("Invoice ID or Amount Received is missing or invalid.");
            return;
        }
        setIsRecording(true);
        const paymentRecord = {
            amount: parseFloat(ackDetails.amountReceived),
            date: ackDetails.paymentDate,
            mode: ackDetails.paymentMode,
            reference: ackDetails.referenceId || null,
            acknowledgedAt: serverTimestamp()
        };

        const invoiceDocRef = doc(db, invoicesPath, invoice.id);
        try {
            await updateDoc(invoiceDocRef, {
                paymentsReceived: arrayUnion(paymentRecord)
            });

            const updatedInvoiceSnap = await getDoc(invoiceDocRef);
            if (updatedInvoiceSnap.exists()) {
                const updatedInvoiceData = updatedInvoiceSnap.data();
                const totalPaid = (updatedInvoiceData.paymentsReceived || []).reduce((sum, p) => sum + p.amount, 0);
                const invoiceTotal = calculateInvoiceTotal(updatedInvoiceData);
                if (totalPaid >= invoiceTotal) {
                    await updateDoc(invoiceDocRef, { status: 'Paid' });
                } else if (totalPaid > 0) {
                    await updateDoc(invoiceDocRef, { status: 'Partially Paid' });
                }
            }
            onClose();
        } catch (error) {
            console.error("Error recording payment:", error);
        } finally {
            setIsRecording(false);
        }
    };


    if (!invoice || isLoadingProfile) return <Modal isOpen={isOpen} onClose={onClose} title="Loading Acknowledgement..." size="lg"><LoadingSpinner /></Modal>;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Acknowledge Payment for Invoice #${invoice.invoiceNumber}`} size="2xl">
            <div className="space-y-4">
                <Input label="Amount Received (₹) *" name="amountReceived" type="number" value={ackDetails.amountReceived} onChange={handleAckInputChange} required />
                <Input label="Payment Date *" name="paymentDate" type="date" value={ackDetails.paymentDate} onChange={handleAckInputChange} required />
                <Input label="Payment Mode *" name="paymentMode" value={ackDetails.paymentMode} onChange={handleAckInputChange} placeholder="e.g., Cash, UPI, Bank Transfer" required />
                <Input label="Reference/Transaction ID (Optional)" name="referenceId" value={ackDetails.referenceId} onChange={handleAckInputChange} />
                <Input label="Client Email (for sending)" name="clientEmail" type="email" value={ackDetails.clientEmail} onChange={handleAckInputChange} placeholder="client@example.com" />
                <Input label="Client WhatsApp (+CountryCodeNumber)" name="clientWhatsApp" type="tel" value={ackDetails.clientWhatsApp} onChange={handleAckInputChange} placeholder="+91XXXXXXXXXX" />
                <Input label="Authorized Signatory (for PDF)" name="authorizedSignatory" value={ackDetails.authorizedSignatory} onChange={handleAckInputChange} placeholder="Your Name / Company Name" />


                <div className="mt-4 p-3 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 max-h-60 overflow-y-auto">
                    <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Acknowledgement Preview:</h4>
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">{acknowledgementText}</pre>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                    <Button onClick={handleGeneratePdfPreview} variant="secondary" className="flex-grow sm:flex-grow-0">
                        <Printer size={18} className="mr-2" /> Generate & Preview PDF
                    </Button>
                    <Button onClick={handleSendEmail} variant="info" disabled={!ackDetails.clientEmail || !acknowledgementText} className="flex-grow sm:flex-grow-0">
                        <Mail size={18} className="mr-2" /> Send via Email
                    </Button>
                    <Button onClick={handleSendWhatsApp} variant="success" disabled={!ackDetails.clientWhatsApp || !acknowledgementText} className="flex-grow sm:flex-grow-0">
                        <WhatsAppIcon size={18} className="mr-2" /> Send via WhatsApp
                    </Button>
                </div>
                <div className="mt-6 border-t dark:border-gray-700 pt-4">
                    <Button onClick={handleRecordPayment} variant="primary" className="w-full" disabled={isRecording}>
                        {isRecording ? <LoadingSpinner small={true} /> : <CheckCircle size={18} className="mr-2" />} Record Payment & Update Invoice
                    </Button>
                </div>
            </div>
        </Modal>
    );
}


function AcknowledgeLabourPaymentModal({ isOpen, onClose, payment, projectUsers, project }) {
    const labourer = (projectUsers || []).find(u => u.id === payment?.labourerId);
    const [ackDetails, setAckDetails] = useState({
        email: labourer?.email || '',
        phone: labourer?.phone || '',
        message: ''
    });
    const [companyProfile, setCompanyProfile] = useState(null);

    useEffect(() => {
        if (isOpen && auth.currentUser?.uid) {
            const profilePath = `/artifacts/${appId}/users/${auth.currentUser.uid}/companyProfile/main`;
            const unsub = onSnapshot(doc(db, profilePath), (docSnap) => {
                if (docSnap.exists()) setCompanyProfile(docSnap.data());
                else setCompanyProfile({ companyName: "Your Company" });
            });
            return () => unsub();
        }
    }, [isOpen]);


    useEffect(() => {
        if (payment && labourer && companyProfile) {
            const defaultMessage = `Dear ${labourer.name || 'User'},\n\nThis is to acknowledge the receipt of ${formatCurrency(payment.amount)} (Cash) on ${formatDate(payment.paymentDate)} for your work on project "${project.name}".\n\nThank you.\n\nSincerely,\n${companyProfile.companyName || 'The Company'}`;
            setAckDetails(prev => ({
                ...prev,
                email: labourer.email || '',
                phone: labourer.phone || '',
                message: defaultMessage
            }));
        }
    }, [payment, labourer, project, companyProfile]);

    const handleAckInputChange = (e) => {
        const { name, value } = e.target;
        setAckDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSendEmail = () => {
        const subject = `Payment Acknowledgement - Project ${project.name}`;
        const body = encodeURIComponent(ackDetails.message);
        window.location.href = `mailto:${ackDetails.email}?subject=${encodeURIComponent(subject)}&body=${body}`;
    };

    const handleSendWhatsApp = () => {
        let phoneNumber = ackDetails.phone.replace(/\D/g, '');
        const message = encodeURIComponent(ackDetails.message);
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    };

    if (!payment || !labourer) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Acknowledge Payment to ${labourer.name}`} size="lg">
            <div className="space-y-4">
                <p><strong>Project User:</strong> {labourer.name} ({labourer.role || 'N/A'})</p>
                <p><strong>Amount Paid:</strong> {formatCurrency(payment.amount)}</p>
                <p><strong>Payment Date:</strong> {formatDate(payment.paymentDate)}</p>

                <Input label="User Email (for sending)" name="email" type="email" value={ackDetails.email} onChange={handleAckInputChange} placeholder="user@example.com" />
                <Input label="User WhatsApp (+CountryCodeNumber)" name="phone" type="tel" value={ackDetails.phone} onChange={handleAckInputChange} placeholder="+91XXXXXXXXXX" />

                <Textarea label="Acknowledgement Message" name="message" value={ackDetails.message} onChange={handleAckInputChange} rows={7} />

                <div className="flex gap-3 mt-6">
                    <Button onClick={handleSendEmail} variant="info" disabled={!ackDetails.email || !ackDetails.message} className="w-full">
                        <Mail size={18} className="mr-2" /> Send via Email
                    </Button>
                    <Button onClick={handleSendWhatsApp} variant="success" disabled={!ackDetails.phone || !ackDetails.message} className="w-full">
                        <WhatsAppIcon size={18} className="mr-2" /> Send via WhatsApp
                    </Button>
                </div>
            </div>
        </Modal>
    );
}


export default App;

