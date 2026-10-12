"""
HIDDEN GROUND TRUTH of the C3 synthetic world.

!!! SYNTHETIC - READ BEFORE QUOTING ANY RESULT !!!
Real Sri Lankan job advertisements have not been collected yet, and real student data
needs ethics approval (submitted, not yet granted). Until then this module defines a
made-up "world": what each role really requires (ROLE_TEMPLATES), how ads phrase
skills (SURFACE), and which certifications exist. Generators sample ads and students
from it, and the simulated "expert" relevance labels are computed from it.

The models NEVER import this module: they only see generated ad TEXT and student
answers. Because the expert labels and the ads come from the same templates, any
metric measured on this world shows that the pipeline works; it is not evidence of
real-world accuracy. The values below are plausible guesses, not measurements.
"""
from __future__ import annotations

# role -> skill -> (probability an ad for this role mentions the skill, typical required level 1-3)
ROLE_TEMPLATES: dict[str, dict[str, tuple[float, int]]] = {
    "software_engineer": {
        "prog_oop": (0.90, 2), "backend_api": (0.75, 2), "databases_sql": (0.75, 2), "version_control": (0.70, 2),
        "problem_solving": (0.60, 2), "communication": (0.60, 2), "javascript_ts": (0.55, 2), "agile": (0.50, 1),
        "frontend": (0.45, 2), "devops_cicd": (0.30, 1), "cloud": (0.30, 1), "nosql": (0.30, 1),
        "containers": (0.25, 1), "testing_manual": (0.20, 1), "linux": (0.20, 1),
    },
    "frontend_engineer": {
        "javascript_ts": (0.95, 3), "frontend": (0.95, 3), "version_control": (0.70, 2), "ui_ux": (0.50, 1),
        "communication": (0.50, 2), "agile": (0.45, 1), "backend_api": (0.30, 1), "problem_solving": (0.30, 2),
        "test_automation": (0.25, 1),
    },
    "mobile_developer": {
        "mobile": (0.95, 3), "prog_oop": (0.60, 2), "version_control": (0.60, 2), "communication": (0.50, 2),
        "backend_api": (0.40, 1), "agile": (0.40, 1), "javascript_ts": (0.35, 2), "ui_ux": (0.35, 1),
        "databases_sql": (0.30, 1), "nosql": (0.30, 1),
    },
    "qa_engineer": {
        "testing_manual": (0.95, 3), "test_automation": (0.75, 2), "communication": (0.70, 2), "agile": (0.60, 2),
        "databases_sql": (0.45, 1), "prog_oop": (0.40, 1), "version_control": (0.40, 1), "javascript_ts": (0.25, 1),
        "business_analysis": (0.20, 1), "devops_cicd": (0.20, 1),
    },
    "devops_engineer": {
        "devops_cicd": (0.95, 3), "containers": (0.90, 3), "cloud": (0.85, 2), "linux": (0.85, 2),
        "version_control": (0.70, 2), "communication": (0.50, 2), "python": (0.40, 1), "networking": (0.40, 1),
        "security": (0.30, 1), "agile": (0.30, 1),
    },
    "data_analyst": {
        "data_analysis": (0.95, 3), "databases_sql": (0.90, 2), "communication": (0.70, 2), "statistics": (0.65, 2),
        "python": (0.50, 1), "business_analysis": (0.35, 1), "problem_solving": (0.30, 1), "machine_learning": (0.15, 1),
    },
    "data_scientist": {
        "machine_learning": (0.95, 3), "python": (0.95, 3), "statistics": (0.85, 2), "data_analysis": (0.60, 2),
        "databases_sql": (0.60, 2), "communication": (0.50, 2), "version_control": (0.40, 1), "problem_solving": (0.40, 2),
        "cloud": (0.30, 1), "containers": (0.20, 1),
    },
    "business_analyst": {
        "business_analysis": (0.95, 3), "communication": (0.90, 3), "agile": (0.70, 2), "data_analysis": (0.40, 1),
        "databases_sql": (0.35, 1), "ui_ux": (0.30, 1), "project_management": (0.30, 1), "testing_manual": (0.30, 1),
    },
    "ui_ux_designer": {
        "ui_ux": (0.95, 3), "communication": (0.70, 2), "frontend": (0.45, 1), "agile": (0.40, 1),
        "business_analysis": (0.30, 1), "javascript_ts": (0.25, 1),
    },
    "network_engineer": {
        "networking": (0.95, 3), "security": (0.60, 2), "linux": (0.55, 2), "communication": (0.50, 2),
        "cloud": (0.30, 1), "problem_solving": (0.30, 1),
    },
    "cybersecurity_analyst": {
        "security": (0.95, 3), "networking": (0.80, 2), "linux": (0.65, 2), "communication": (0.50, 2),
        "python": (0.35, 1), "cloud": (0.35, 1), "problem_solving": (0.30, 1),
    },
    "project_coordinator": {
        "project_management": (0.90, 2), "communication": (0.90, 3), "agile": (0.85, 2), "business_analysis": (0.45, 1),
        "problem_solving": (0.30, 1), "data_analysis": (0.25, 1),
    },
}

# How ads and CVs phrase each skill. Entries marked OOV are deliberately NOT in the
# taxonomy, so the extractor cannot find them (keeps recall honest).
SURFACE: dict[str, list[str]] = {
    "prog_oop": ["Java", "C#", "OOP concepts", "object-oriented programming", "Core Java", "design patterns", "C++"],  # C++: OOV
    "python": ["Python", "Python 3", "Python scripting"],
    "javascript_ts": ["JavaScript", "TypeScript", "ES6", "JS"],
    "problem_solving": ["problem solving", "analytical skills", "data structures and algorithms", "critical thinking", "logical reasoning"],  # OOV: logical reasoning
    "version_control": ["Git", "GitHub", "Bitbucket", "version control"],
    "frontend": ["React", "React.js", "Angular", "Vue.js", "HTML5", "CSS3", "Tailwind CSS", "Next.js", "Redux", "Svelte"],  # OOV: Svelte
    "backend_api": ["Node.js", "Express.js", "Spring Boot", "REST APIs", "ASP.NET Core", "Django", "Laravel", "microservices", "GraphQL", "Hibernate"],  # OOV: Hibernate
    "mobile": ["Android", "Kotlin", "Flutter", "React Native", "Swift", "iOS", "Jetpack Compose"],  # OOV: Jetpack Compose
    "databases_sql": ["SQL", "MySQL", "PostgreSQL", "MS SQL Server", "relational databases", "database design", "SQLite"],  # OOV: SQLite
    "nosql": ["MongoDB", "Redis", "NoSQL", "Firestore", "Couchbase"],  # OOV: Couchbase
    "data_analysis": ["Power BI", "Tableau", "data visualisation", "data analysis", "pandas", "Advanced Excel", "Google Sheets"],  # OOV: Google Sheets
    "machine_learning": ["machine learning", "deep learning", "TensorFlow", "PyTorch", "scikit-learn", "NLP", "computer vision", "XGBoost"],  # OOV: XGBoost
    "statistics": ["statistics", "statistical analysis", "hypothesis testing", "regression analysis", "A/B testing"],  # OOV: A/B testing
    "cloud": ["AWS", "Azure", "GCP", "cloud computing", "Google Cloud"],
    "devops_cicd": ["CI/CD", "Jenkins", "GitHub Actions", "Terraform", "Ansible", "Azure DevOps", "ArgoCD"],  # OOV: ArgoCD
    "containers": ["Docker", "Kubernetes", "containerization", "Helm"],
    "linux": ["Linux", "Bash", "shell scripting", "Ubuntu", "PowerShell"],
    "networking": ["TCP/IP", "CCNA", "routing and switching", "LAN/WAN", "VLANs", "DNS and DHCP", "Cisco"],  # VLANs: plural, missed
    "security": ["cybersecurity", "penetration testing", "SIEM", "OWASP Top 10", "vulnerability assessment", "incident response", "Burp Suite"],  # OOV: Burp Suite
    "testing_manual": ["manual testing", "test cases", "test plans", "regression testing", "defect tracking", "QA processes", "UAT"],
    "test_automation": ["Selenium", "Cypress", "Playwright", "test automation", "JUnit", "Appium", "Postman", "Robot Framework"],  # OOV: Robot Framework
    "agile": ["Agile", "Scrum", "Kanban", "JIRA", "sprint planning"],
    "ui_ux": ["Figma", "UI/UX", "wireframing", "prototyping", "user research", "Adobe XD", "usability testing"],
    "business_analysis": ["requirements gathering", "business analysis", "BRD", "user stories", "UML", "BPMN", "use cases"],
    "project_management": ["project management", "project planning", "risk management", "MS Project", "PRINCE2", "Gantt charts"],  # OOV: Gantt charts
    "communication": ["communication skills", "written and verbal communication", "English", "presentation skills", "teamwork", "interpersonal skills"],
}

# certification text as it appears in ads -> (certification id, skill it relates to)
CERT_TEXT: list[tuple[str, str, str]] = [
    ("AWS Certified Cloud Practitioner", "aws_cloud_practitioner", "cloud"),
    ("Microsoft Azure Fundamentals (AZ-900)", "azure_fundamentals", "cloud"),
    ("CCNA", "ccna", "networking"),
    ("CompTIA Security+", "comptia_security_plus", "security"),
    ("ISTQB Foundation Level", "istqb_foundation", "testing_manual"),
    ("PMP", "pmp", "project_management"),
    ("Professional Scrum Master (PSM I)", "scrum_master", "agile"),
    ("Google Data Analytics Professional Certificate", "google_data_analytics", "data_analysis"),
    ("Oracle Certified Professional, Java SE", "oracle_java", "prog_oop"),
]
