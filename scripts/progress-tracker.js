import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PROGRESS_FILE = path.join(ROOT_DIR, 'docs', 'DEVELOPMENT_PROGRESS.md');
const STATE_FILE = path.join(ROOT_DIR, 'docs', '.progress_state.json');

export const TASKS = [
  // PHASE 1: PROJECT FOUNDATION
  { id: 1, phase: 1, title: 'chore: initialize CareConnect Ethiopia repository', desc: 'Establish the root project structure.' },
  { id: 2, phase: 1, title: 'docs: add project overview and objectives', desc: 'Document the project\'s purpose and target users.' },
  { id: 3, phase: 1, title: 'docs: add software requirements specification', desc: 'Add the complete SDS.' },
  { id: 4, phase: 1, title: 'docs: add system architecture documentation', desc: 'Document the four portals and backend services.' },
  { id: 5, phase: 1, title: 'chore: configure root npm workspace', desc: 'Configure independent frontend applications.' },
  { id: 6, phase: 1, title: 'chore: configure shared development scripts', desc: 'Add root-level development commands.' },
  { id: 7, phase: 1, title: 'chore: configure environment variable templates', desc: 'Add example environment files without secrets.' },
  { id: 8, phase: 1, title: 'chore: configure gitignore and repository hygiene', desc: 'Exclude dependencies, secrets, generated files, and temporary data.' },
  { id: 9, phase: 1, title: 'chore: configure code formatting and linting', desc: 'Establish consistent code quality rules.' },
  { id: 10, phase: 1, title: 'docs: add initial installation and setup guide', desc: 'Document development environment requirements.' },

  // PHASE 2: DATABASE FOUNDATION
  { id: 11, phase: 2, title: 'db: configure PostgreSQL connection', desc: 'Configure the database connection.' },
  { id: 12, phase: 2, title: 'db: create initial migration structure', desc: 'Establish version-controlled migrations.' },
  { id: 13, phase: 2, title: 'db: create roles and permissions tables', desc: 'Define user roles and permissions.' },
  { id: 14, phase: 2, title: 'db: create users table', desc: 'Store authenticated system users.' },
  { id: 15, phase: 2, title: 'db: create healthcare facilities table', desc: 'Store health centres and hospitals.' },
  { id: 16, phase: 2, title: 'db: create facility services table', desc: 'Store services provided by facilities.' },
  { id: 17, phase: 2, title: 'db: create facility capacity table', desc: 'Store time-stamped facility capacity reports.' },
  { id: 18, phase: 2, title: 'db: create patients table', desc: 'Store necessary patient referral information.' },
  { id: 19, phase: 2, title: 'db: create referrals table', desc: 'Store referral records and relationships.' },
  { id: 20, phase: 2, title: 'db: add initial database constraints and indexes', desc: 'Add foreign keys, unique constraints, and useful indexes.' },

  // PHASE 3: DATABASE COMPLETION
  { id: 21, phase: 3, title: 'db: create referral documents table', desc: 'Store uploaded document metadata.' },
  { id: 22, phase: 3, title: 'db: create referral events table', desc: 'Maintain referral status history.' },
  { id: 23, phase: 3, title: 'db: create transport records table', desc: 'Store transportation coordination.' },
  { id: 24, phase: 3, title: 'db: create referral feedback table', desc: 'Store receiving hospital feedback.' },
  { id: 25, phase: 3, title: 'db: create notifications table', desc: 'Store user notifications.' },
  { id: 26, phase: 3, title: 'db: create audit logs table', desc: 'Record important user actions.' },
  { id: 27, phase: 3, title: 'db: create AI recommendations table', desc: 'Store recommended facilities and explanations.' },
  { id: 28, phase: 3, title: 'db: create AI predictions table', desc: 'Store prediction results and model versions.' },
  { id: 29, phase: 3, title: 'db: create AI model versions and feedback tables', desc: 'Maintain model information and evaluation feedback.' },
  { id: 30, phase: 3, title: 'db: implement database seeds and relationship tests', desc: 'Add clearly identified fictional demo records and test relationships.' },

  // PHASE 4: BACKEND FOUNDATION
  { id: 31, phase: 4, title: 'backend: initialize Express application', desc: 'Create the main API application.' },
  { id: 32, phase: 4, title: 'backend: configure environment and application settings', desc: 'Load environment variables safely.' },
  { id: 33, phase: 4, title: 'backend: configure PostgreSQL database client', desc: 'Connect the backend to PostgreSQL.' },
  { id: 34, phase: 4, title: 'backend: add centralized error handling', desc: 'Standardize error responses.' },
  { id: 35, phase: 4, title: 'backend: add request validation middleware', desc: 'Validate incoming API data.' },
  { id: 36, phase: 4, title: 'backend: configure CORS and security headers', desc: 'Configure allowed frontend origins and security headers.' },
  { id: 37, phase: 4, title: 'backend: add request logging', desc: 'Record useful request information.' },
  { id: 38, phase: 4, title: 'backend: add API versioning', desc: 'Establish versioned API routes.' },
  { id: 39, phase: 4, title: 'backend: add health check endpoint', desc: 'Provide API and database health checks.' },
  { id: 40, phase: 4, title: 'backend: add API documentation foundation', desc: 'Document available endpoints.' },

  // PHASE 5: AUTHENTICATION AND AUTHORIZATION
  { id: 41, phase: 5, title: 'backend: implement user registration', desc: 'Register authorized users.' },
  { id: 42, phase: 5, title: 'backend: implement secure password hashing', desc: 'Store password hashes securely.' },
  { id: 43, phase: 5, title: 'backend: implement user login', desc: 'Authenticate users.' },
  { id: 44, phase: 5, title: 'backend: implement access token management', desc: 'Protect authenticated endpoints.' },
  { id: 45, phase: 5, title: 'backend: implement refresh token management', desc: 'Support secure session renewal.' },
  { id: 46, phase: 5, title: 'backend: implement logout and token revocation', desc: 'Terminate sessions.' },
  { id: 47, phase: 5, title: 'backend: implement role-based authorization', desc: 'Enforce portal permissions.' },
  { id: 48, phase: 5, title: 'backend: implement facility-based access restrictions', desc: 'Restrict users to authorized facility data.' },
  { id: 49, phase: 5, title: 'backend: implement account activation and deactivation', desc: 'Manage user account status.' },
  { id: 50, phase: 5, title: 'backend: add authentication and authorization tests', desc: 'Test authentication, permissions, and denied access.' },

  // PHASE 6: USER AND FACILITY MANAGEMENT
  { id: 51, phase: 6, title: 'backend: implement user management APIs', desc: 'Create, retrieve, and update users.' },
  { id: 52, phase: 6, title: 'backend: implement user profile APIs', desc: 'Manage user profile information.' },
  { id: 53, phase: 6, title: 'backend: implement role management APIs', desc: 'Manage system roles.' },
  { id: 54, phase: 6, title: 'backend: implement facility registration APIs', desc: 'Register healthcare facilities.' },
  { id: 55, phase: 6, title: 'backend: implement facility update APIs', desc: 'Edit facility information.' },
  { id: 56, phase: 6, title: 'backend: implement facility search and filtering', desc: 'Search facilities.' },
  { id: 57, phase: 6, title: 'backend: implement facility services APIs', desc: 'Manage offered services.' },
  { id: 58, phase: 6, title: 'backend: implement facility capacity reporting APIs', desc: 'Record time-stamped capacity information.' },
  { id: 59, phase: 6, title: 'backend: implement facility location APIs', desc: 'Store and retrieve geographic information.' },
  { id: 60, phase: 6, title: 'backend: test user and facility management', desc: 'Test facility and account operations.' },

  // PHASE 7: PATIENT MANAGEMENT
  { id: 61, phase: 7, title: 'backend: implement patient registration', desc: 'Register patient records.' },
  { id: 62, phase: 7, title: 'backend: implement patient information updates', desc: 'Update permitted patient information.' },
  { id: 63, phase: 7, title: 'backend: implement patient search', desc: 'Search using authorized identifiers.' },
  { id: 64, phase: 7, title: 'backend: implement patient details endpoint', desc: 'Retrieve patient details.' },
  { id: 65, phase: 7, title: 'backend: implement patient referral history', desc: 'Retrieve associated referrals.' },
  { id: 66, phase: 7, title: 'backend: implement patient access restrictions', desc: 'Protect patient information.' },
  { id: 67, phase: 7, title: 'backend: implement patient input validation', desc: 'Validate patient fields.' },
  { id: 68, phase: 7, title: 'backend: implement patient record audit events', desc: 'Record important patient record changes.' },
  { id: 69, phase: 7, title: 'backend: add patient pagination and filtering', desc: 'Support efficient patient lists.' },
  { id: 70, phase: 7, title: 'backend: test patient management workflows', desc: 'Test patient management.' },

  // PHASE 8: CORE REFERRAL MANAGEMENT
  { id: 71, phase: 8, title: 'backend: implement referral creation', desc: 'Create draft referrals.' },
  { id: 72, phase: 8, title: 'backend: implement unique referral number generation', desc: 'Generate unique referral IDs.' },
  { id: 73, phase: 8, title: 'backend: implement referral information validation', desc: 'Validate required fields.' },
  { id: 74, phase: 8, title: 'backend: implement referral update', desc: 'Edit draft referrals.' },
  { id: 75, phase: 8, title: 'backend: implement referral submission', desc: 'Submit referrals to receiving facilities.' },
  { id: 76, phase: 8, title: 'backend: implement incoming referral retrieval', desc: 'Retrieve hospital referrals.' },
  { id: 77, phase: 8, title: 'backend: implement referral details endpoint', desc: 'Retrieve full authorized referral details.' },
  { id: 78, phase: 8, title: 'backend: implement referral acknowledgement', desc: 'Record hospital acknowledgement.' },
  { id: 79, phase: 8, title: 'backend: implement referral acceptance and rejection', desc: 'Support hospital decisions with appropriate reasons.' },
  { id: 80, phase: 8, title: 'backend: implement additional information requests', desc: 'Allow hospitals to request missing information.' },

  // PHASE 9: REFERRAL WORKFLOW AND COORDINATION
  { id: 81, phase: 9, title: 'backend: implement referral status transition rules', desc: 'Validate allowed workflow transitions.' },
  { id: 82, phase: 9, title: 'backend: implement referral event history', desc: 'Record status changes.' },
  { id: 83, phase: 9, title: 'backend: implement referral cancellation', desc: 'Support authorized cancellation.' },
  { id: 84, phase: 9, title: 'backend: implement referral assignment and reassignment rules', desc: 'Manage the receiving facility before appropriate workflow stages.' },
  { id: 85, phase: 9, title: 'backend: implement referral filtering and pagination', desc: 'Search referral records efficiently.' },
  { id: 86, phase: 9, title: 'backend: implement referral timeline API', desc: 'Return chronological events.' },
  { id: 87, phase: 9, title: 'backend: implement referral feedback API', desc: 'Record hospital feedback.' },
  { id: 88, phase: 9, title: 'backend: implement referral outcome management', desc: 'Record completion information.' },
  { id: 89, phase: 9, title: 'backend: implement referral closure rules', desc: 'Close completed referral workflows.' },
  { id: 90, phase: 9, title: 'backend: test complete referral lifecycle', desc: 'Test the referral process end to end.' },

  // PHASE 10: DOCUMENT AND FILE MANAGEMENT
  { id: 91, phase: 10, title: 'backend: configure secure file upload', desc: 'Add controlled file upload handling.' },
  { id: 92, phase: 10, title: 'backend: implement document type validation', desc: 'Restrict supported file formats.' },
  { id: 93, phase: 10, title: 'backend: implement document size validation', desc: 'Enforce upload limits.' },
  { id: 94, phase: 10, title: 'backend: implement referral document storage', desc: 'Store uploaded document metadata and files.' },
  { id: 95, phase: 10, title: 'backend: implement document retrieval authorization', desc: 'Protect uploaded documents.' },
  { id: 96, phase: 10, title: 'backend: implement document deletion rules', desc: 'Support authorized document removal.' },
  { id: 97, phase: 10, title: 'backend: implement document processing status', desc: 'Track document processing.' },
  { id: 98, phase: 10, title: 'backend: implement document audit events', desc: 'Record document activities.' },
  { id: 99, phase: 10, title: 'backend: implement document upload tests', desc: 'Test upload and access restrictions.' },
  { id: 100, phase: 10, title: 'docs: document secure document management', desc: 'Document storage and privacy procedures.' },

  // PHASE 11: TRANSPORTATION BACKEND
  { id: 101, phase: 11, title: 'backend: implement transport request creation', desc: 'Create transport requests.' },
  { id: 102, phase: 11, title: 'backend: implement transport request listing', desc: 'Retrieve authorized requests.' },
  { id: 103, phase: 11, title: 'backend: implement transport assignment', desc: 'Assign available transportation resources.' },
  { id: 104, phase: 11, title: 'backend: implement transport resource management', desc: 'Manage available transport resources.' },
  { id: 105, phase: 11, title: 'backend: implement transport status transitions', desc: 'Manage transport lifecycle.' },
  { id: 106, phase: 11, title: 'backend: implement transport departure updates', desc: 'Record departure.' },
  { id: 107, phase: 11, title: 'backend: implement transport arrival updates', desc: 'Record arrival.' },
  { id: 108, phase: 11, title: 'backend: implement transport delay reporting', desc: 'Record delays and explanations.' },
  { id: 109, phase: 11, title: 'backend: implement transport history', desc: 'Retrieve transport activities.' },
  { id: 110, phase: 11, title: 'backend: test transportation workflows', desc: 'Test the full transportation lifecycle.' },

  // PHASE 12: NOTIFICATIONS AND REPORTING BACKEND
  { id: 111, phase: 12, title: 'backend: implement notification creation service', desc: 'Create application notifications.' },
  { id: 112, phase: 12, title: 'backend: implement notification retrieval', desc: 'Retrieve user notifications.' },
  { id: 113, phase: 12, title: 'backend: implement notification read status', desc: 'Mark notifications as read.' },
  { id: 114, phase: 12, title: 'backend: implement referral event notifications', desc: 'Notify relevant users of referral changes.' },
  { id: 115, phase: 12, title: 'backend: implement transport notifications', desc: 'Notify users of transportation changes.' },
  { id: 116, phase: 12, title: 'backend: implement administrative delay alerts', desc: 'Identify overdue administrative workflows.' },
  { id: 117, phase: 12, title: 'backend: implement health centre dashboard statistics', desc: 'Calculate health centre metrics.' },
  { id: 118, phase: 12, title: 'backend: implement hospital dashboard statistics', desc: 'Calculate hospital metrics.' },
  { id: 119, phase: 12, title: 'backend: implement transport dashboard statistics', desc: 'Calculate transport metrics.' },
  { id: 120, phase: 12, title: 'backend: implement administrator analytics APIs', desc: 'Provide platform-wide metrics.' },

  // PHASE 13: AI SERVICE FOUNDATION
  { id: 121, phase: 13, title: 'ai: initialize Python AI service', desc: 'Create the AI application.' },
  { id: 122, phase: 13, title: 'ai: configure FastAPI application', desc: 'Configure API entry points.' },
  { id: 123, phase: 13, title: 'ai: configure Python dependencies', desc: 'Add required AI packages.' },
  { id: 124, phase: 13, title: 'ai: implement AI service health checks', desc: 'Monitor AI service availability.' },
  { id: 125, phase: 13, title: 'ai: implement AI request validation', desc: 'Validate incoming AI requests.' },
  { id: 126, phase: 13, title: 'ai: implement AI error handling', desc: 'Standardize AI service errors.' },
  { id: 127, phase: 13, title: 'ai: implement AI logging', desc: 'Record processing events without exposing patient information unnecessarily.' },
  { id: 128, phase: 13, title: 'ai: configure model and dataset directories', desc: 'Organize AI resources.' },
  { id: 129, phase: 13, title: 'ai: implement model version management', desc: 'Track AI model versions.' },
  { id: 130, phase: 13, title: 'ai: add AI service tests', desc: 'Test service initialization and basic endpoints.' },

  // PHASE 14: OCR AND NLP
  { id: 131, phase: 14, title: 'ai: configure Tesseract OCR', desc: 'Set up document text extraction.' },
  { id: 132, phase: 14, title: 'ai: implement document image preprocessing', desc: 'Use OpenCV to improve image readability.' },
  { id: 133, phase: 14, title: 'ai: implement OCR extraction endpoint', desc: 'Extract text from uploaded referral documents.' },
  { id: 134, phase: 14, title: 'ai: implement OCR extraction result validation', desc: 'Validate extracted content.' },
  { id: 135, phase: 14, title: 'ai: implement referral information extraction', desc: 'Identify relevant referral fields.' },
  { id: 136, phase: 14, title: 'ai: implement referral text normalization', desc: 'Clean extracted text.' },
  { id: 137, phase: 14, title: 'ai: implement referral summarization', desc: 'Generate concise referral summaries.' },
  { id: 138, phase: 14, title: 'ai: implement referral completeness checking', desc: 'Identify missing required information.' },
  { id: 139, phase: 14, title: 'ai: implement English and Amharic text handling', desc: 'Prepare multilingual processing.' },
  { id: 140, phase: 14, title: 'ai: test OCR and NLP processing', desc: 'Evaluate extraction and processing using fictional test documents.' },

  // PHASE 15: AI CLASSIFICATION AND RECOMMENDATION
  { id: 141, phase: 15, title: 'ai: prepare referral classification dataset', desc: 'Create a clearly documented training dataset.' },
  { id: 142, phase: 15, title: 'ai: implement referral category preprocessing', desc: 'Prepare text for classification.' },
  { id: 143, phase: 15, title: 'ai: train initial referral classification model', desc: 'Train a baseline model.' },
  { id: 144, phase: 15, title: 'ai: evaluate referral classification model', desc: 'Calculate suitable evaluation metrics.' },
  { id: 145, phase: 15, title: 'ai: implement referral classification API', desc: 'Expose classification results.' },
  { id: 146, phase: 15, title: 'ai: implement hospital service matching', desc: 'Match required services with facilities.' },
  { id: 147, phase: 15, title: 'ai: implement facility distance calculation', desc: 'Calculate geographic distance.' },
  { id: 148, phase: 15, title: 'ai: implement hospital recommendation ranking', desc: 'Rank facilities using configured weighted factors.' },
  { id: 149, phase: 15, title: 'ai: implement recommendation explanations', desc: 'Explain recommendation factors.' },
  { id: 150, phase: 15, title: 'ai: test hospital recommendation results', desc: 'Evaluate recommendation behavior with controlled sample cases.' },

  // PHASE 16: ADVANCED AI FUNCTIONS
  { id: 151, phase: 16, title: 'ai: implement approved referral review flags', desc: 'Flag cases requiring professional review based on approved rules.' },
  { id: 152, phase: 16, title: 'ai: implement historical referral delay dataset preparation', desc: 'Prepare suitable historical data.' },
  { id: 153, phase: 16, title: 'ai: implement baseline delay estimation', desc: 'Establish a transparent baseline before training a prediction model.' },
  { id: 154, phase: 16, title: 'ai: train referral delay prediction model', desc: 'Train only if sufficient reliable labeled data exists.' },
  { id: 155, phase: 16, title: 'ai: evaluate delay prediction performance', desc: 'Evaluate model results.' },
  { id: 156, phase: 16, title: 'ai: implement potential duplicate referral detection', desc: 'Identify potentially duplicated records.' },
  { id: 157, phase: 16, title: 'ai: implement hospital workload analysis', desc: 'Analyze historical referral demand.' },
  { id: 158, phase: 16, title: 'ai: implement referral anomaly detection', desc: 'Identify unusual administrative patterns.' },
  { id: 159, phase: 16, title: 'ai: implement referral pattern analytics', desc: 'Identify common referral trends.' },
  { id: 160, phase: 16, title: 'ai: add AI model performance reporting', desc: 'Record actual evaluation results and model versions.' },

  // PHASE 17: AI ASSISTANT AND INTEGRATION
  { id: 161, phase: 17, title: 'ai: implement system knowledge base', desc: 'Prepare trusted CareConnect documentation.' },
  { id: 162, phase: 17, title: 'ai: implement grounded system assistant', desc: 'Answer questions about system operation.' },
  { id: 163, phase: 17, title: 'ai: implement administrative translation service', desc: 'Support English and Amharic administrative information.' },
  { id: 164, phase: 17, title: 'ai: implement referral status explanation', desc: 'Explain recorded referral progress.' },
  { id: 165, phase: 17, title: 'ai: implement AI feedback collection', desc: 'Collect authorized user feedback.' },
  { id: 166, phase: 17, title: 'backend: configure AI service client', desc: 'Connect the main API to FastAPI.' },
  { id: 167, phase: 17, title: 'backend: implement secure AI request forwarding', desc: 'Control AI requests and permissions.' },
  { id: 168, phase: 17, title: 'backend: implement AI processing result storage', desc: 'Store relevant AI outputs.' },
  { id: 169, phase: 17, title: 'backend: implement AI processing status management', desc: 'Track processing and failure states.' },
  { id: 170, phase: 17, title: 'integration: test backend and AI communication', desc: 'Verify the complete API integration.' },

  // PHASE 18: HEALTH CENTRE FRONTEND
  { id: 171, phase: 18, title: 'frontend(health): initialize independent Vite application', desc: 'Set up the health centre application on port 5173.' },
  { id: 172, phase: 18, title: 'frontend(health): implement branding and design system', desc: 'Establish its visual identity.' },
  { id: 173, phase: 18, title: 'frontend(health): implement authentication pages', desc: 'Build login and recovery interfaces.' },
  { id: 174, phase: 18, title: 'frontend(health): implement dashboard', desc: 'Build dashboard metrics and charts.' },
  { id: 175, phase: 18, title: 'frontend(health): implement patient management', desc: 'Build patient list and forms.' },
  { id: 176, phase: 18, title: 'frontend(health): implement referral creation', desc: 'Build the complete referral form.' },
  { id: 177, phase: 18, title: 'frontend(health): implement document upload and AI review', desc: 'Build the AI-assisted document workflow.' },
  { id: 178, phase: 18, title: 'frontend(health): implement hospital recommendation interface', desc: 'Build recommendation cards and comparison.' },
  { id: 179, phase: 18, title: 'frontend(health): implement referral tracking and timeline', desc: 'Build referral progress views.' },
  { id: 180, phase: 18, title: 'frontend(health): implement reports and responsive navigation', desc: 'Complete health centre reporting and mobile UI.' },

  // PHASE 19: HOSPITAL FRONTEND
  { id: 181, phase: 19, title: 'frontend(hospital): initialize independent Vite application', desc: 'Set up the hospital application on port 5174.' },
  { id: 182, phase: 19, title: 'frontend(hospital): implement branding and design system', desc: 'Establish its separate visual identity.' },
  { id: 183, phase: 19, title: 'frontend(hospital): implement authentication pages', desc: 'Build hospital login.' },
  { id: 184, phase: 19, title: 'frontend(hospital): implement hospital dashboard', desc: 'Build incoming referral metrics and charts.' },
  { id: 185, phase: 19, title: 'frontend(hospital): implement incoming referral management', desc: 'Build referral lists and filters.' },
  { id: 186, phase: 19, title: 'frontend(hospital): implement referral details and review', desc: 'Build complete referral review pages.' },
  { id: 187, phase: 19, title: 'frontend(hospital): implement acknowledgement and response actions', desc: 'Build accept, reject, and information request interfaces.' },
  { id: 188, phase: 19, title: 'frontend(hospital): implement patient arrival management', desc: 'Build arrival and referral progress pages.' },
  { id: 189, phase: 19, title: 'frontend(hospital): implement facility services and capacity management', desc: 'Build service and capacity management.' },
  { id: 190, phase: 19, title: 'frontend(hospital): implement feedback and reporting', desc: 'Complete hospital reports and responsive UI.' },

  // PHASE 20: TRANSPORT FRONTEND
  { id: 191, phase: 20, title: 'frontend(transport): initialize independent Vite application', desc: 'Set up the transport application on port 5175.' },
  { id: 192, phase: 20, title: 'frontend(transport): implement branding and design system', desc: 'Establish its separate visual identity.' },
  { id: 193, phase: 20, title: 'frontend(transport): implement authentication pages', desc: 'Build transport login.' },
  { id: 194, phase: 20, title: 'frontend(transport): implement transport dashboard', desc: 'Build transport statistics and charts.' },
  { id: 195, phase: 20, title: 'frontend(transport): implement transport request management', desc: 'Build transport request list.' },
  { id: 196, phase: 20, title: 'frontend(transport): implement transport assignment forms', desc: 'Build assignment workflows.' },
  { id: 197, phase: 20, title: 'frontend(transport): implement in-transit management', desc: 'Build transport status updates.' },
  { id: 198, phase: 20, title: 'frontend(transport): implement facility map and route visualization', desc: 'Build map-based transport views.' },
  { id: 199, phase: 20, title: 'frontend(transport): implement transport resource management', desc: 'Build resource management.' },
  { id: 200, phase: 20, title: 'frontend(transport): implement transport reports and responsive UI', desc: 'Complete transport reporting and mobile navigation.' },

  // PHASE 21: ADMINISTRATOR FRONTEND
  { id: 201, phase: 21, title: 'frontend(admin): initialize independent Vite application', desc: 'Set up the administrator application on port 5176.' },
  { id: 202, phase: 21, title: 'frontend(admin): implement branding and design system', desc: 'Establish its separate visual identity.' },
  { id: 203, phase: 21, title: 'frontend(admin): implement administrator authentication', desc: 'Build administrator login.' },
  { id: 204, phase: 21, title: 'frontend(admin): implement system overview dashboard', desc: 'Build system-wide statistics.' },
  { id: 205, phase: 21, title: 'frontend(admin): implement user and role management', desc: 'Build user and permission interfaces.' },
  { id: 206, phase: 21, title: 'frontend(admin): implement healthcare facility management', desc: 'Build facility management.' },
  { id: 207, phase: 21, title: 'frontend(admin): implement referral monitoring', desc: 'Build platform-wide referral monitoring.' },
  { id: 208, phase: 21, title: 'frontend(admin): implement AI management interface', desc: 'Build AI feature and model management pages.' },
  { id: 209, phase: 21, title: 'frontend(admin): implement analytics and audit logs', desc: 'Build reporting and audit views.' },
  { id: 210, phase: 21, title: 'frontend(admin): implement settings and responsive navigation', desc: 'Complete administrator settings and responsive UI.' },

  // PHASE 22: INTEGRATION, SECURITY, TESTING AND DEPLOYMENT
  { id: 211, phase: 22, title: 'integration: connect health centre portal to backend APIs', desc: 'Integrate patients and referral workflows.' },
  { id: 212, phase: 22, title: 'integration: connect hospital portal to backend APIs', desc: 'Integrate incoming referrals and hospital actions.' },
  { id: 213, phase: 22, title: 'integration: connect transport portal to backend APIs', desc: 'Integrate transportation workflows.' },
  { id: 214, phase: 22, title: 'integration: connect administrator portal to backend APIs', desc: 'Integrate users, facilities, analytics, and monitoring.' },
  { id: 215, phase: 22, title: 'security: implement cross-portal access verification', desc: 'Test permissions across all portals.' },
  { id: 216, phase: 22, title: 'test: add complete referral lifecycle integration tests', desc: 'Test referral creation through completion.' },
  { id: 217, phase: 22, title: 'test: add cross-service and AI integration tests', desc: 'Test the main API, database, and AI service.' },
  { id: 218, phase: 22, title: 'test: perform responsive, performance, and security verification', desc: 'Verify the applications on different screen sizes and test important security controls.' },
  { id: 219, phase: 22, title: 'deploy: configure independent portal and service deployments', desc: 'Prepare separate deployment configurations and production environments.' },
  { id: 220, phase: 22, title: 'docs: finalize installation, deployment, API, and user documentation', desc: 'Document the completed platform.' }
];

export function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch {
      // fallback
    }
  }
  const initial = {};
  for (const t of TASKS) {
    initial[t.id] = {
      id: t.id,
      title: t.title,
      phase: t.phase,
      status: 'NOT STARTED',
      commitHash: '',
      testsPerformed: 'None',
      remainingIssues: 'None'
    };
  }
  return initial;
}

export function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  renderMarkdown(state);
}

export function updateTask(id, fields) {
  const state = loadState();
  if (!state[id]) {
    throw new Error(`Task ${id} not found`);
  }
  state[id] = { ...state[id], ...fields };
  saveState(state);
}

export function renderMarkdown(state) {
  const total = TASKS.length;
  let committed = 0;
  let inProgress = 0;
  let tested = 0;
  let implemented = 0;

  for (const t of Object.values(state)) {
    if (t.status === 'COMMITTED') committed++;
    else if (t.status === 'TESTED') tested++;
    else if (t.status === 'IMPLEMENTED') implemented++;
    else if (t.status === 'IN PROGRESS') inProgress++;
  }

  const lines = [
    '# CARECONNECT ETHIOPIA — DEVELOPMENT PROGRESS TRACKER',
    '',
    `**Total Tasks / Commits Planned:** ${total}  `,
    `**Committed:** ${committed} / ${total} (${((committed / total) * 100).toFixed(1)}%)  `,
    `**Tested / Implemented / In Progress:** ${tested} / ${implemented} / ${inProgress}  `,
    `**Last Updated:** ${new Date().toISOString()}  `,
    '',
    '---',
    '',
    '## PROGRESS SUMMARY BY PHASE',
    '',
    '| Phase | Title | Range | Committed | Status |',
    '|---|---|---|---|---|'
  ];

  const phaseNames = [
    'Project Foundation',
    'Database Foundation',
    'Database Completion',
    'Backend Foundation',
    'Authentication and Authorization',
    'User and Facility Management',
    'Patient Management',
    'Core Referral Management',
    'Referral Workflow and Coordination',
    'Document and File Management',
    'Transportation Backend',
    'Notifications and Reporting Backend',
    'AI Service Foundation',
    'OCR and NLP',
    'AI Classification and Recommendation',
    'Advanced AI Functions',
    'AI Assistant and Integration',
    'Health Centre Frontend',
    'Hospital Frontend',
    'Transport Frontend',
    'Administrator Frontend',
    'Integration, Security, Testing and Deployment'
  ];

  for (let p = 1; p <= 22; p++) {
    const start = (p - 1) * 10 + 1;
    const end = p * 10;
    const pTasks = Object.values(state).filter(t => t.phase === p);
    const pDone = pTasks.filter(t => t.status === 'COMMITTED').length;
    const statusText = pDone === 10 ? '✅ COMPLETED' : pDone > 0 ? '🔄 IN PROGRESS' : '⏳ PENDING';
    lines.push(`| Phase ${p} | ${phaseNames[p - 1]} | ${start}–${end} | ${pDone}/10 | ${statusText} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## DETAILED TASK LOG');
  lines.push('');
  lines.push('| # | Phase | Title | Status | Commit Hash | Tests Performed | Remaining Issues |');
  lines.push('|---|---|---|---|---|---|---|');

  for (const t of TASKS) {
    const s = state[t.id];
    const statusIcon = s.status === 'COMMITTED' ? '✅ COMMITTED' :
                       s.status === 'TESTED' ? '🧪 TESTED' :
                       s.status === 'IMPLEMENTED' ? '🔨 IMPLEMENTED' :
                       s.status === 'IN PROGRESS' ? '⚙️ IN PROGRESS' : '⏳ NOT STARTED';
    const hash = s.commitHash ? `\`${s.commitHash}\`` : '-';
    lines.push(`| ${s.id} | ${s.phase} | ${s.title} | ${statusIcon} | ${hash} | ${s.testsPerformed.replace(/\|/g, '/')} | ${s.remainingIssues.replace(/\|/g, '/')} |`);
  }

  lines.push('');
  fs.writeFileSync(PROGRESS_FILE, lines.join('\n'), 'utf-8');
}

// If run directly: node scripts/progress-tracker.js init
if (process.argv[2] === 'init') {
  const state = loadState();
  saveState(state);
  console.log(`Initialized progress tracker with ${TASKS.length} tasks in docs/DEVELOPMENT_PROGRESS.md`);
}
