/**
 * C3 - mock-interview question bank (FR13).
 *
 * Hand-authored (October 2026, AI-assisted) for SLIIT Year 3/4 IT students and the
 * 12 C3 roles. Questions and key points are in English because IT interviews in Sri
 * Lanka are normally conducted in English; the surrounding UI is trilingual.
 * MUST be reviewed by a SLIIT lecturer / industry interviewer before any study.
 *
 * Each technical question is linked to one taxonomy skill so the session can focus
 * on the student's highest-gain skill gaps. `keyPoints` are what a good answer
 * should mention; each key point lists lower-case `terms` (any one is enough) that
 * the rubric looks for. `level` is the depth of the question (1 basic - 3 advanced).
 */

export type QuestionType = "technical" | "behavioural" | "situational";

export type KeyPoint = { label: string; terms: string[] };

export type InterviewQuestion = {
  id: string;
  type: QuestionType;
  /** Taxonomy skill the question tests (technical questions only). */
  skillId: string | null;
  /** Roles a situational question belongs to; empty = any role. */
  roleIds: string[];
  level: 1 | 2 | 3;
  prompt: string;
  keyPoints: KeyPoint[];
  /** A short outline of a strong answer, shown after the student answers. */
  modelAnswer: string;
  minWords: number;
  idealWords: number;
};

const t = (
  id: string,
  skillId: string,
  level: 1 | 2 | 3,
  prompt: string,
  keyPoints: KeyPoint[],
  modelAnswer: string,
  minWords = 40,
  idealWords = 110
): InterviewQuestion => ({ id, type: "technical", skillId, roleIds: [], level, prompt, keyPoints, modelAnswer, minWords, idealWords });

const kp = (label: string, ...terms: string[]): KeyPoint => ({ label, terms });

export const INTERVIEW_BANK_VERSION = "1.0.0";

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // ------------------------------------------------------------------ software engineering
  t("T-OOP-1", "prog_oop", 1, "Explain the four main principles of object-oriented programming with a short example.", [
    kp("Encapsulation", "encapsulation", "private", "data hiding", "getter"),
    kp("Inheritance", "inheritance", "extends", "subclass", "parent class"),
    kp("Polymorphism", "polymorphism", "override", "overriding", "overloading"),
    kp("Abstraction", "abstraction", "abstract", "interface"),
    kp("A concrete example", "example", "for instance", "such as", "class")
  ], "Encapsulation hides state behind methods; inheritance lets a subclass reuse a parent class; polymorphism lets one interface have many implementations (overriding); abstraction exposes only what matters (abstract classes / interfaces). Example: a Shape interface with Circle and Square classes."),
  t("T-OOP-2", "prog_oop", 2, "What is the difference between an abstract class and an interface, and when would you use each?", [
    kp("Abstract class can hold state / implementation", "state", "implementation", "fields", "constructor"),
    kp("Interface defines a contract", "contract", "method signatures", "interface"),
    kp("Multiple inheritance of interfaces", "multiple", "implements"),
    kp("When to use each", "when", "use", "shared code", "unrelated classes")
  ], "An abstract class can hold fields, constructors and shared implementation for closely related classes; an interface is a contract that unrelated classes can implement, and a class can implement many interfaces. Use an abstract class for shared base behaviour, an interface for capabilities."),
  t("T-OOP-3", "prog_oop", 3, "Describe a design pattern you have used (for example Singleton, Factory, Observer or Strategy). What problem did it solve?", [
    kp("Names a pattern", "singleton", "factory", "observer", "strategy", "builder", "adapter", "repository", "mvc"),
    kp("The problem it solved", "problem", "needed", "issue", "because"),
    kp("How it works", "instance", "create", "notify", "subscribe", "interchangeable", "encapsulate"),
    kp("Trade-offs", "trade-off", "drawback", "disadvantage", "testing", "coupling")
  ], "Name the pattern, the concrete problem (e.g. many payment providers), how the pattern solved it (Strategy: one interface, interchangeable implementations chosen at runtime) and a trade-off (more classes, harder to trace).", 50, 130),
  t("T-PY-1", "python", 1, "What are the main differences between a list, a tuple and a dictionary in Python?", [
    kp("List is mutable and ordered", "list", "mutable", "ordered"),
    kp("Tuple is immutable", "tuple", "immutable"),
    kp("Dictionary stores key-value pairs", "dictionary", "dict", "key", "value"),
    kp("When to use each", "when", "use", "lookup", "hashable")
  ], "Lists are ordered and mutable; tuples are ordered and immutable (can be dictionary keys); dictionaries map keys to values with fast lookup. Choose by whether data changes and how you access it."),
  t("T-PY-2", "python", 2, "How would you read a large CSV file in Python, clean it and summarise it? Mention the libraries you would use.", [
    kp("pandas or csv module", "pandas", "csv", "read_csv"),
    kp("Handling missing / bad values", "missing", "null", "nan", "dropna", "fillna", "clean"),
    kp("Memory for large files", "chunk", "chunksize", "memory", "iterator", "generator"),
    kp("Summary statistics / grouping", "groupby", "describe", "mean", "aggregate", "summary")
  ], "Use pandas.read_csv (with chunksize for very large files), handle missing values (dropna / fillna), fix types, then summarise with describe() and groupby().agg(). Mention validating the result."),
  t("T-JS-1", "javascript_ts", 1, "Explain the difference between let, const and var in JavaScript.", [
    kp("var is function-scoped", "var", "function scope", "function-scoped", "hoisting", "hoisted"),
    kp("let / const are block-scoped", "block", "block scope", "block-scoped"),
    kp("const cannot be reassigned", "const", "reassign", "reassigned"),
    kp("Recommended usage", "prefer", "default", "use const")
  ], "var is function-scoped and hoisted; let and const are block-scoped; const cannot be reassigned (but objects can still be mutated). Prefer const, use let when the value changes, avoid var."),
  t("T-JS-2", "javascript_ts", 2, "What problem do Promises and async/await solve in JavaScript? Give an example.", [
    kp("Asynchronous operations", "asynchronous", "async", "non-blocking"),
    kp("Avoiding callback hell", "callback", "nested", "readable"),
    kp("Error handling", "try", "catch", "reject", "error"),
    kp("Example (fetch / API call)", "fetch", "api", "await", "example")
  ], "They make asynchronous code (e.g. an API call with fetch) readable instead of nested callbacks. async/await lets you write sequential-looking code; errors are handled with try/catch or .catch on rejected promises."),
  t("T-DSA-1", "problem_solving", 1, "What is the time complexity of searching in an array, a sorted array with binary search, and a hash map?", [
    kp("Linear search O(n)", "o(n)", "linear"),
    kp("Binary search O(log n)", "log n", "logarithmic", "binary search"),
    kp("Hash map O(1) average", "o(1)", "constant", "hash"),
    kp("Explains why", "because", "half", "each step", "collision")
  ], "Unsorted array: O(n) linear search. Sorted array: O(log n) because binary search halves the range each step. Hash map: O(1) on average, O(n) worst case with many collisions."),
  t("T-DSA-2", "problem_solving", 2, "How would you find duplicate values in a list of one million numbers efficiently?", [
    kp("Use a set / hash map", "set", "hash", "dictionary", "map"),
    kp("Complexity O(n)", "o(n)", "linear", "one pass"),
    kp("Alternative: sort first", "sort", "n log n"),
    kp("Memory trade-off", "memory", "space", "trade-off")
  ], "Walk through once, adding items to a hash set and recording any already present: O(n) time, O(n) memory. Alternative: sort (O(n log n)) and compare neighbours with less extra memory."),
  t("T-GIT-1", "version_control", 1, "Explain your normal Git workflow when working on a feature in a team.", [
    kp("Create a branch", "branch", "feature branch", "checkout"),
    kp("Commit with clear messages", "commit", "message"),
    kp("Pull request and review", "pull request", "pr", "review", "merge request"),
    kp("Keep up to date / resolve conflicts", "pull", "rebase", "merge", "conflict")
  ], "Create a feature branch from main, make small commits with clear messages, push and open a pull request, address review comments, keep the branch updated (merge or rebase) and resolve conflicts before merging."),
  t("T-GIT-2", "version_control", 2, "What is the difference between git merge and git rebase? When would you avoid rebasing?", [
    kp("Merge keeps history with a merge commit", "merge commit", "preserves", "history"),
    kp("Rebase rewrites history linearly", "rewrite", "linear", "replay"),
    kp("Avoid rebasing shared branches", "shared", "public", "pushed", "others")
  ], "Merge joins histories with a merge commit; rebase replays your commits on top of another branch for a linear history. Never rebase commits others already pulled (shared/public branches)."),
  // ------------------------------------------------------------------ web and mobile
  t("T-FE-1", "frontend", 1, "How does a browser render a web page, and what can make a page load slowly?", [
    kp("HTML parsed into DOM", "dom", "html", "parse"),
    kp("CSS and layout / paint", "css", "layout", "paint", "render"),
    kp("JavaScript blocking", "javascript", "blocking", "defer", "async"),
    kp("Performance causes", "images", "large", "requests", "bundle", "caching", "lazy")
  ], "The browser parses HTML into the DOM and CSS into the CSSOM, builds the render tree, lays out and paints. Slow pages come from large images and bundles, too many requests, render-blocking scripts and missing caching; fix with compression, lazy loading, defer and caching."),
  t("T-FE-2", "frontend", 2, "In React, what are props and state, and how do you decide where state should live?", [
    kp("Props are passed from parent", "props", "parent", "read-only"),
    kp("State is owned by a component", "state", "usestate", "re-render"),
    kp("Lift state up / shared state", "lift", "shared", "common parent", "context", "redux"),
    kp("Example", "example", "form", "counter")
  ], "Props are read-only inputs passed from a parent; state is data a component owns that triggers a re-render when it changes (useState). Keep state in the lowest common parent of the components that need it (lift state up), or use context/Redux for app-wide data."),
  t("T-FE-3", "frontend", 3, "How would you make a web application accessible to users with disabilities?", [
    kp("Semantic HTML", "semantic", "heading", "button", "label"),
    kp("Keyboard navigation and focus", "keyboard", "focus", "tab"),
    kp("Alt text / ARIA", "alt", "aria", "screen reader"),
    kp("Colour contrast", "contrast", "colour", "color"),
    kp("Standards / testing", "wcag", "lighthouse", "axe", "test")
  ], "Use semantic HTML and labels, make everything keyboard reachable with visible focus, add alt text and ARIA only where needed, ensure colour contrast, and test against WCAG with tools like axe/Lighthouse and a screen reader.", 50, 120),
  t("T-BE-1", "backend_api", 1, "What is a REST API? Explain the common HTTP methods and status codes.", [
    kp("Resources over HTTP", "resource", "http", "endpoint", "url"),
    kp("Methods GET POST PUT DELETE", "get", "post", "put", "patch", "delete"),
    kp("Status codes", "200", "201", "400", "401", "404", "500", "status code"),
    kp("Stateless / JSON", "stateless", "json")
  ], "REST exposes resources at URLs and uses HTTP methods: GET reads, POST creates, PUT/PATCH update, DELETE removes. Responses use status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error), usually with JSON, and each request is stateless."),
  t("T-BE-2", "backend_api", 2, "How would you secure a REST API that stores student data?", [
    kp("Authentication", "authentication", "jwt", "token", "oauth", "login"),
    kp("Authorisation / roles", "authorisation", "authorization", "role", "rbac", "permission"),
    kp("Input validation", "validation", "validate", "sanitize", "injection"),
    kp("HTTPS / encryption", "https", "tls", "encrypt", "encryption"),
    kp("Rate limiting / logging", "rate limit", "rate limiting", "logging", "audit")
  ], "Authenticate every request (e.g. JWT/OAuth), check roles for authorisation, validate all input to prevent injection, use HTTPS and encrypt sensitive data at rest, add rate limiting, and log access without logging personal data.", 50, 120),
  t("T-BE-3", "backend_api", 3, "When would you choose a microservices architecture over a monolith, and what are the risks?", [
    kp("Independent deployment / scaling", "independent", "scale", "deploy", "team"),
    kp("Complexity / network", "complexity", "network", "latency", "distributed"),
    kp("Data consistency", "consistency", "transaction", "database per service"),
    kp("Start with monolith when small", "monolith", "small", "start")
  ], "Microservices help when teams and parts of the system must deploy and scale independently; they add distributed-system complexity (network failures, latency, monitoring) and data-consistency problems. Small teams usually start with a well-structured monolith.", 50, 130),
  t("T-MOB-1", "mobile", 1, "What is the activity / screen lifecycle in a mobile app, and why does it matter?", [
    kp("Lifecycle states", "oncreate", "onresume", "onpause", "lifecycle", "initstate", "dispose"),
    kp("Saving state", "save", "state", "restore"),
    kp("Releasing resources", "release", "resources", "battery", "memory"),
    kp("Example (rotation / background)", "rotation", "background", "example")
  ], "Screens move through states (created, resumed, paused, destroyed). You must save and restore state (e.g. on rotation), release resources such as the camera or listeners when paused, and avoid memory leaks and battery drain."),
  t("T-MOB-2", "mobile", 2, "How would you make a mobile app work well with a slow or unavailable internet connection?", [
    kp("Local storage / caching", "cache", "local", "sqlite", "offline"),
    kp("Sync when online", "sync", "queue", "retry"),
    kp("User feedback", "loading", "message", "indicator", "user"),
    kp("Minimise data", "compress", "pagination", "small")
  ], "Cache data locally (e.g. SQLite) so the app works offline, queue changes and sync with retries when the connection returns, show clear loading/offline messages, and reduce data with pagination and compression."),
  // ------------------------------------------------------------------ data and AI
  t("T-SQL-1", "databases_sql", 1, "Explain the difference between INNER JOIN and LEFT JOIN with an example.", [
    kp("INNER JOIN returns matches only", "inner", "matching", "both tables"),
    kp("LEFT JOIN keeps all left rows", "left", "all rows", "null"),
    kp("Example tables", "students", "orders", "example", "customers")
  ], "INNER JOIN returns only rows that match in both tables; LEFT JOIN returns every row from the left table, with NULLs where the right table has no match. Example: students LEFT JOIN enrolments also lists students with no enrolment."),
  t("T-SQL-2", "databases_sql", 2, "What is database normalisation and why is it useful? Mention the first three normal forms.", [
    kp("Reduce redundancy", "redundancy", "duplicate", "anomal"),
    kp("1NF atomic values", "1nf", "atomic", "first normal"),
    kp("2NF partial dependency", "2nf", "partial", "second normal"),
    kp("3NF transitive dependency", "3nf", "transitive", "third normal")
  ], "Normalisation organises tables to remove redundancy and update anomalies: 1NF atomic values and no repeating groups; 2NF no partial dependency on part of a composite key; 3NF no transitive dependency between non-key columns."),
  t("T-SQL-3", "databases_sql", 3, "A query on a large table is slow. How do you find the cause and speed it up?", [
    kp("Execution plan", "explain", "execution plan", "query plan"),
    kp("Indexes", "index", "indexes"),
    kp("Avoid full scans / select *", "full scan", "select", "filter", "where"),
    kp("Measure before and after", "measure", "benchmark", "time")
  ], "Measure it, read the execution plan (EXPLAIN) to find full table scans, add the right indexes on filter/join columns, select only needed columns, rewrite the query if needed, and measure again."),
  t("T-NOSQL-1", "nosql", 2, "When would you choose MongoDB instead of a relational database?", [
    kp("Flexible schema / documents", "flexible", "schema", "document", "json"),
    kp("Scaling horizontally", "scale", "horizontal", "sharding"),
    kp("When relational is better", "relational", "transactions", "joins", "consistency")
  ], "Choose a document database for flexible or changing schemas, nested JSON-like data and horizontal scaling; prefer a relational database when you need complex joins, strong consistency and multi-row transactions."),
  t("T-DA-1", "data_analysis", 1, "Walk me through how you would analyse a dataset to answer a business question.", [
    kp("Understand the question", "question", "goal", "business", "stakeholder"),
    kp("Clean the data", "clean", "missing", "duplicate", "outlier"),
    kp("Explore and analyse", "explore", "analyse", "analyze", "group", "trend"),
    kp("Visualise and communicate", "visual", "dashboard", "chart", "power bi", "tableau", "present")
  ], "Clarify the business question and metric, collect and clean the data (missing values, duplicates, outliers), explore trends and segments, then visualise the findings (e.g. Power BI) and present a clear recommendation."),
  t("T-DA-2", "data_analysis", 2, "How do you choose the right chart for your data? Give examples.", [
    kp("Line for trends over time", "line", "time", "trend"),
    kp("Bar for comparing categories", "bar", "compare", "categor"),
    kp("Avoid misleading charts", "misleading", "pie", "3d", "axis"),
    kp("Audience", "audience", "simple", "message")
  ], "Pick the chart from the question: lines for change over time, bars to compare categories, scatter for relationships, a single number for a headline. Avoid misleading choices (3D, truncated axes, too many pie slices) and keep one clear message for the audience."),
  t("T-ML-1", "machine_learning", 1, "What is overfitting and how can you prevent it?", [
    kp("Definition", "overfitting", "training data", "memorise", "memorize", "generalise", "generalize"),
    kp("Train / test split or cross-validation", "test set", "validation", "cross-validation", "split"),
    kp("Regularisation / simpler model", "regularisation", "regularization", "simpler", "dropout", "pruning"),
    kp("More data / early stopping", "more data", "early stopping", "augmentation")
  ], "Overfitting is when a model learns noise in the training data and generalises poorly. Detect it with a held-out test set or cross-validation; prevent it with simpler models, regularisation, dropout, early stopping and more data."),
  t("T-ML-2", "machine_learning", 2, "How do you evaluate a classification model on an imbalanced dataset?", [
    kp("Accuracy is misleading", "accuracy", "misleading", "imbalanced"),
    kp("Precision and recall / F1", "precision", "recall", "f1"),
    kp("Confusion matrix / ROC", "confusion matrix", "roc", "auc"),
    kp("Resampling / class weights", "oversampling", "undersampling", "smote", "class weight", "threshold")
  ], "Accuracy is misleading when one class dominates; use precision, recall, F1, the confusion matrix and ROC/PR-AUC, choose the threshold for the business cost, and consider class weights or resampling (e.g. SMOTE) on the training data only."),
  t("T-ML-3", "machine_learning", 3, "How would you explain a machine-learning model's prediction to a non-technical user?", [
    kp("Feature importance / contributions", "feature importance", "contribution", "shap", "lime"),
    kp("Simple language / example", "simple", "example", "plain"),
    kp("Limitations / uncertainty", "uncertain", "limitation", "confidence", "probability"),
    kp("Fairness / trust", "fair", "bias", "trust")
  ], "Show which factors pushed the prediction up or down (feature contributions, e.g. SHAP), in plain language with an example, state the uncertainty and limits, and check that the explanation does not hide bias.", 50, 120),
  t("T-STAT-1", "statistics", 1, "What is the difference between correlation and causation? Give an example.", [
    kp("Correlation measures association", "correlation", "associated", "relationship"),
    kp("Causation means one causes the other", "causation", "cause", "causes"),
    kp("Confounding variable", "confounding", "third variable", "hidden"),
    kp("Example / experiment", "example", "experiment", "randomised", "a/b")
  ], "Correlation means two variables move together; causation means one changes the other. A confounder can explain both (ice-cream sales and drowning both rise in summer). Randomised experiments (A/B tests) are needed to show causation."),
  t("T-STAT-2", "statistics", 2, "Explain what a p-value tells you in a hypothesis test.", [
    kp("Null hypothesis", "null hypothesis", "null"),
    kp("Probability of data this extreme", "probability", "extreme", "chance"),
    kp("Significance level", "0.05", "significance", "alpha"),
    kp("Not the probability the hypothesis is true", "not", "effect size", "practical")
  ], "Assuming the null hypothesis is true, the p-value is the probability of seeing data at least this extreme. If it is below the chosen significance level (e.g. 0.05) we reject the null. It is not the probability the hypothesis is true and says nothing about effect size."),
  // ------------------------------------------------------------------ cloud, infrastructure, security
  t("T-CLOUD-1", "cloud", 1, "What are IaaS, PaaS and SaaS? Give an example of each.", [
    kp("IaaS - virtual machines", "iaas", "virtual machine", "ec2", "infrastructure"),
    kp("PaaS - managed platform", "paas", "platform", "app service", "heroku", "vercel"),
    kp("SaaS - complete software", "saas", "gmail", "office 365", "software"),
    kp("Responsibility split", "manage", "responsib", "control")
  ], "IaaS gives you virtual machines and networks (AWS EC2); PaaS runs your code on a managed platform (Azure App Service, Vercel); SaaS is ready-to-use software (Gmail). The further you go, the less you manage yourself."),
  t("T-CLOUD-2", "cloud", 2, "How would you keep cloud costs under control for a student project or start-up?", [
    kp("Free tier / right-sizing", "free tier", "right-size", "size", "small instance"),
    kp("Auto-scaling / stop idle resources", "auto-scaling", "autoscaling", "stop", "idle", "shut down"),
    kp("Budgets and alerts", "budget", "alert", "billing"),
    kp("Serverless / managed services", "serverless", "lambda", "managed")
  ], "Use free tiers, right-size instances, stop idle resources, use auto-scaling or serverless for spiky load, and set budgets with billing alerts."),
  t("T-CICD-1", "devops_cicd", 1, "What is CI/CD and why do teams use it?", [
    kp("Continuous integration - automatic build and test", "continuous integration", "build", "test", "every commit"),
    kp("Continuous delivery / deployment", "continuous delivery", "continuous deployment", "deploy", "release"),
    kp("Pipeline tools", "jenkins", "github actions", "gitlab", "pipeline"),
    kp("Benefits", "faster", "early", "bugs", "reliable", "automate")
  ], "CI builds and tests every change automatically; CD automatically prepares or deploys releases. Pipelines (GitHub Actions, Jenkins) catch bugs early and make releases small, frequent and reliable."),
  t("T-CICD-2", "devops_cicd", 2, "Design a simple CI/CD pipeline for a web application. What stages would it have?", [
    kp("Build", "build", "install", "compile"),
    kp("Test", "test", "unit", "lint"),
    kp("Package / container", "docker", "image", "artifact", "package"),
    kp("Deploy to staging then production", "staging", "production", "deploy"),
    kp("Rollback / approval", "rollback", "approval", "monitor")
  ], "Stages: install and build, lint and run tests, build a Docker image or artifact, deploy to staging, run smoke tests, then deploy to production (with approval) and monitor, with a rollback path.", 50, 120),
  t("T-CONT-1", "containers", 1, "What is the difference between a Docker image and a container, and why use containers?", [
    kp("Image is a template", "image", "template", "blueprint", "read-only"),
    kp("Container is a running instance", "container", "running", "instance"),
    kp("Consistency across environments", "consistent", "works on my machine", "environment", "portable"),
    kp("Lightweight vs VMs", "lightweight", "virtual machine", "vm", "kernel")
  ], "An image is a read-only template built from a Dockerfile; a container is a running instance of it. Containers package an app with its dependencies so it runs the same everywhere, and are lighter than virtual machines because they share the host kernel."),
  t("T-CONT-2", "containers", 3, "What does Kubernetes add on top of Docker?", [
    kp("Orchestration across machines", "orchestration", "cluster", "nodes"),
    kp("Scaling", "scale", "replicas", "autoscal"),
    kp("Self-healing / restarts", "restart", "self-healing", "health"),
    kp("Services / load balancing / rolling updates", "service", "load balanc", "rolling")
  ], "Kubernetes orchestrates containers across a cluster: it schedules pods on nodes, scales replicas, restarts unhealthy containers, provides services and load balancing, and performs rolling updates."),
  t("T-LNX-1", "linux", 1, "Which Linux commands would you use to find why a server is running out of disk space?", [
    kp("df for disk usage", "df"),
    kp("du to find large folders", "du"),
    kp("find / ls for large files", "find", "ls", "sort"),
    kp("Logs / cleanup", "log", "logs", "rotate", "clean")
  ], "Use df -h to see which filesystem is full, du -sh to find large directories, find to locate large files, then clean or rotate logs and remove old artifacts."),
  t("T-NET-1", "networking", 1, "What happens, step by step, when you type a website address in a browser?", [
    kp("DNS lookup", "dns", "ip address", "resolve"),
    kp("TCP connection / handshake", "tcp", "handshake", "connection"),
    kp("TLS for HTTPS", "tls", "ssl", "https", "certificate"),
    kp("HTTP request and response", "http", "request", "response", "server")
  ], "The browser resolves the name to an IP via DNS, opens a TCP connection (three-way handshake), negotiates TLS for HTTPS, sends an HTTP request, the server responds, and the browser renders the page."),
  t("T-NET-2", "networking", 2, "Explain the difference between TCP and UDP and give a use case for each.", [
    kp("TCP reliable, connection-oriented", "tcp", "reliable", "connection", "ordered"),
    kp("UDP connectionless, faster", "udp", "connectionless", "faster", "no guarantee"),
    kp("Use cases", "video", "streaming", "gaming", "dns", "web", "file transfer")
  ], "TCP is connection-oriented and reliable (ordered delivery, retransmission) - used for web pages and file transfer. UDP is connectionless and lighter with no delivery guarantee - used for streaming, gaming and DNS."),
  t("T-NET-3", "networking", 2, "What is a VLAN and why would an organisation use one?", [
    kp("Logical network segmentation", "logical", "segment", "segmentation", "broadcast domain"),
    kp("Security / isolation", "security", "isolate", "isolation"),
    kp("Performance / management", "performance", "traffic", "manage")
  ], "A VLAN splits one physical switch network into separate logical networks (broadcast domains), isolating departments for security, reducing broadcast traffic and making management easier."),
  t("T-SEC-1", "security", 1, "Explain SQL injection and how to prevent it.", [
    kp("Untrusted input changes the query", "input", "query", "malicious", "untrusted"),
    kp("Parameterised queries / prepared statements", "parameterised", "parameterized", "prepared statement", "placeholder"),
    kp("Validation / least privilege", "validate", "validation", "least privilege", "orm")
  ], "SQL injection happens when untrusted input is concatenated into a query so an attacker can change it. Prevent it with parameterised queries / prepared statements (or an ORM), input validation and least-privilege database accounts."),
  t("T-SEC-2", "security", 2, "What is the CIA triad, and how would you protect each part?", [
    kp("Confidentiality", "confidentiality", "encryption", "access control"),
    kp("Integrity", "integrity", "hash", "checksum", "signature"),
    kp("Availability", "availability", "backup", "redundancy", "ddos")
  ], "Confidentiality (encryption, access control), integrity (hashes, digital signatures, change control) and availability (backups, redundancy, DDoS protection)."),
  t("T-SEC-3", "security", 3, "You notice suspicious logins on a company server at night. How do you respond?", [
    kp("Contain / isolate", "contain", "isolate", "disable", "block"),
    kp("Investigate logs", "log", "logs", "siem", "investigate"),
    kp("Escalate / incident process", "escalate", "report", "incident response", "team"),
    kp("Recover and lessons learned", "reset", "patch", "recover", "lessons", "mfa")
  ], "Follow the incident-response process: contain (disable the account, block the IP), investigate logs/SIEM for scope, escalate to the security lead, eradicate and recover (reset credentials, patch, enable MFA), then document lessons learned.", 50, 120),
  // ------------------------------------------------------------------ quality assurance
  t("T-QA-1", "testing_manual", 1, "How would you write test cases for a login page?", [
    kp("Valid login", "valid", "correct", "success"),
    kp("Invalid / empty input", "invalid", "wrong password", "empty", "blank"),
    kp("Boundary / security cases", "boundary", "length", "sql injection", "locked"),
    kp("Expected results", "expected", "result", "message")
  ], "Cover the valid path, invalid and empty username/password, boundary lengths, locked accounts after failed attempts, security inputs (SQL injection), UI messages, and state the expected result for each case."),
  t("T-QA-2", "testing_manual", 2, "Explain the difference between severity and priority of a bug, with an example.", [
    kp("Severity is impact", "severity", "impact"),
    kp("Priority is urgency to fix", "priority", "urgency", "fix first"),
    kp("Example of high/low combination", "example", "logo", "crash", "typo")
  ], "Severity is how badly the bug affects the system; priority is how soon it must be fixed. A typo in the company logo on the home page is low severity but high priority; a crash in a rarely used admin report can be high severity but lower priority."),
  t("T-QA-3", "testing_manual", 2, "What is regression testing and when do you do it?", [
    kp("Re-testing existing features", "existing", "previously", "still work"),
    kp("After changes / fixes", "change", "fix", "release", "new feature"),
    kp("Automation helps", "automate", "automation", "suite")
  ], "Regression testing re-checks existing features after code changes, fixes or new features to make sure nothing that used to work is broken; it is usually automated as a suite run on every release."),
  t("T-AUTO-1", "test_automation", 1, "Which tests would you automate first, and which would you keep manual?", [
    kp("Automate repetitive / regression tests", "repetitive", "regression", "stable"),
    kp("Test pyramid / unit tests", "unit", "pyramid", "api"),
    kp("Keep exploratory / usability manual", "exploratory", "usability", "manual"),
    kp("Cost / ROI", "cost", "roi", "maintenance")
  ], "Automate stable, repetitive, high-value tests first (unit and API regression, following the test pyramid); keep exploratory, usability and rapidly changing UI checks manual, considering maintenance cost."),
  t("T-AUTO-2", "test_automation", 2, "How do you make UI automation tests (e.g. Selenium or Playwright) less flaky?", [
    kp("Explicit waits, no sleeps", "wait", "explicit wait", "sleep"),
    kp("Stable selectors", "selector", "data-testid", "locator", "id"),
    kp("Independent tests / test data", "independent", "test data", "isolated", "reset"),
    kp("Page Object Model", "page object", "pom")
  ], "Use explicit/auto waits instead of fixed sleeps, stable selectors (data-testid), independent tests with their own data, the Page Object Model, and retries only as a last resort while investigating the root cause."),
  // ------------------------------------------------------------------ product, business, design
  t("T-AGL-1", "agile", 1, "Describe the main Scrum roles, events and artefacts.", [
    kp("Roles", "product owner", "scrum master", "developers", "team"),
    kp("Events", "sprint", "planning", "daily", "stand-up", "review", "retrospective"),
    kp("Artefacts", "product backlog", "sprint backlog", "increment")
  ], "Roles: Product Owner, Scrum Master, Developers. Events: the Sprint, Sprint Planning, Daily Scrum, Sprint Review, Retrospective. Artefacts: Product Backlog, Sprint Backlog, Increment."),
  t("T-AGL-2", "agile", 2, "The team keeps missing sprint goals. What would you do?", [
    kp("Find the root cause", "root cause", "why", "analyse", "retrospective"),
    kp("Realistic planning / velocity", "velocity", "estimate", "capacity", "smaller"),
    kp("Remove blockers / scope", "blocker", "scope", "interrupt", "dependency"),
    kp("Measure improvement", "measure", "track", "improve")
  ], "Use the retrospective to find root causes (over-commitment, unclear stories, interruptions), plan to real velocity and capacity, split stories smaller, protect the sprint scope, remove blockers early and track whether it improves."),
  t("T-UX-1", "ui_ux", 1, "Walk me through your UX design process for a new feature.", [
    kp("Research users", "research", "interview", "user", "persona"),
    kp("Define the problem", "problem", "define", "journey", "pain point"),
    kp("Wireframe / prototype", "wireframe", "prototype", "figma"),
    kp("Test and iterate", "usability test", "test", "feedback", "iterate")
  ], "Research users (interviews, personas), define the problem and journey, sketch and wireframe, build a Figma prototype, test it with real users, and iterate on the feedback before handing over to developers."),
  t("T-UX-2", "ui_ux", 2, "How do you decide if a design is successful after release?", [
    kp("Metrics", "metric", "conversion", "completion", "time on task", "analytics"),
    kp("User feedback", "feedback", "survey", "interview"),
    kp("Usability testing / SUS", "usability", "sus", "test"),
    kp("Compare with goal", "goal", "baseline", "before")
  ], "Compare against goals set before release: task completion, conversion, time on task and errors from analytics, plus qualitative feedback, surveys (e.g. SUS) and usability testing, then iterate."),
  t("T-BA-1", "business_analysis", 1, "How do you gather requirements from stakeholders who are not technical?", [
    kp("Interviews / workshops", "interview", "workshop", "meeting"),
    kp("Observe current process", "observe", "current process", "as-is"),
    kp("Document as user stories / use cases", "user story", "use case", "brd", "document"),
    kp("Confirm and prioritise", "confirm", "validate", "prioritise", "prioritize", "moscow")
  ], "Use interviews and workshops, observe the current (as-is) process, write requirements as user stories or use cases with acceptance criteria, then confirm them with stakeholders and prioritise (e.g. MoSCoW)."),
  t("T-BA-2", "business_analysis", 2, "Write a user story with acceptance criteria for a student booking a meeting with a mentor.", [
    kp("As a ... I want ... so that", "as a", "i want", "so that"),
    kp("Acceptance criteria", "acceptance criteria", "given", "when", "then"),
    kp("Edge cases", "already booked", "cancel", "unavailable", "conflict")
  ], "As a student, I want to book an available slot with my mentor so that I get guidance at a convenient time. Acceptance criteria (Given/When/Then): only free slots are shown; booking sends confirmation to both; a booked slot cannot be double-booked; the student can cancel before 24 hours."),
  t("T-PM-1", "project_management", 1, "How would you plan a small software project with a fixed deadline?", [
    kp("Scope / work breakdown", "scope", "wbs", "breakdown", "tasks"),
    kp("Estimate and schedule", "estimate", "schedule", "gantt", "timeline", "milestone"),
    kp("Risks", "risk", "contingency", "buffer"),
    kp("Track and communicate", "track", "status", "communicate", "stakeholder")
  ], "Agree the scope, break it into tasks (WBS), estimate and schedule with milestones, identify risks and keep a buffer, then track progress and communicate status to stakeholders regularly."),
  t("T-PM-2", "project_management", 2, "A key team member leaves in the middle of a project. What do you do?", [
    kp("Assess impact", "impact", "assess", "critical"),
    kp("Re-plan / re-assign", "re-plan", "reassign", "re-assign", "redistribute", "priorit"),
    kp("Knowledge transfer / documentation", "handover", "knowledge", "document"),
    kp("Communicate with stakeholders", "communicate", "stakeholder", "inform", "timeline")
  ], "Assess which tasks and knowledge are at risk, arrange a handover if possible, re-prioritise and re-assign work, adjust the plan, and tell stakeholders early about any change in scope or timeline."),
  t("T-COM-1", "communication", 1, "How would you explain a technical problem to a non-technical manager?", [
    kp("Avoid jargon / simple language", "jargon", "simple", "plain"),
    kp("Focus on impact", "impact", "business", "users", "cost"),
    kp("Analogy / example", "analogy", "example"),
    kp("Options and recommendation", "option", "recommend", "decision")
  ], "Start with the impact on users or the business, avoid jargon (use an analogy), explain the options with their cost and risk, and give a clear recommendation and next step."),
  // ------------------------------------------------------------------ behavioural (STAR)
  ...[
    ["B-TEAM", "Tell me about a time you worked in a team that had a disagreement. What did you do?", [kp("Listened to others", "listen", "listened", "understand"), kp("Found a compromise / agreement", "compromise", "agree", "agreement", "decided"), kp("Communication", "discuss", "meeting", "communicat", "talked")]],
    ["B-FAIL", "Describe a time a project did not go as planned. What did you learn?", [kp("Took responsibility", "responsib", "my mistake", "i should"), kp("What you changed", "changed", "fixed", "improved"), kp("Lesson learned", "learned", "learnt", "lesson", "now i")]],
    ["B-LEAD", "Give an example of when you took the lead on something without being asked.", [kp("Initiative", "initiative", "volunteer", "took the lead", "i proposed"), kp("Organised others", "organis", "organiz", "assigned", "coordinated"), kp("Impact", "result", "improved", "achieved")]],
    ["B-PRESSURE", "Tell me about a time you had several deadlines at once. How did you manage?", [kp("Prioritised", "priorit", "urgent", "important"), kp("Planned time", "plan", "schedule", "timeline", "calendar"), kp("Communicated early", "communicat", "informed", "asked", "extension")]],
    ["B-LEARN", "Describe a time you had to learn a new technology quickly.", [kp("How you learned", "documentation", "tutorial", "course", "practice", "youtube"), kp("Applied it", "applied", "built", "used it", "implemented"), kp("Outcome", "result", "delivered", "completed")]],
    ["B-FEEDBACK", "Tell me about feedback you received that was hard to hear, and what you did with it.", [kp("Accepted the feedback", "accept", "listened", "understood"), kp("Acted on it", "changed", "improved", "practised", "practiced"), kp("Result", "result", "better", "now")]],
    ["B-PROUD", "What project are you most proud of and why?", [kp("Your specific role", "my role", "i was responsible", "i built", "i designed", "i implemented"), kp("Technical detail", "using", "technolog", "stack", "database", "api"), kp("Impact / result", "users", "result", "award", "improved", "learned")]],
    ["B-ETHIC", "Have you ever noticed something wrong or unethical in a project? What did you do?", [kp("Raised it appropriately", "raised", "reported", "told", "supervisor", "lecturer"), kp("Considered impact on people", "users", "privacy", "fair", "impact"), kp("Outcome", "result", "fixed", "changed")]]
  ].map(([id, prompt, points]) => ({
    id: id as string,
    type: "behavioural" as const,
    skillId: null,
    roleIds: [],
    level: 2 as const,
    prompt: prompt as string,
    keyPoints: points as KeyPoint[],
    modelAnswer:
      "Use STAR: Situation (where and when), Task (what you had to achieve), Action (what YOU did - say 'I', not only 'we'), Result (the outcome, ideally with a number, and what you learned).",
    minWords: 60,
    idealWords: 150
  })),
  // ------------------------------------------------------------------ situational, one per role
  ...[
    ["S-SE", "software_engineer", "You are asked to add a feature to a large codebase you have never seen. How do you start?", [kp("Read docs / code / tests", "documentation", "readme", "read the code", "tests"), kp("Ask the team", "ask", "senior", "team", "mentor"), kp("Small safe change with tests", "small", "test", "branch", "review")]],
    ["S-FE", "frontend_engineer", "A designer's Figma screen does not work well on mobile. What do you do?", [kp("Talk to the designer", "designer", "discuss", "talk"), kp("Responsive approach", "responsive", "breakpoint", "mobile first", "media query"), kp("Test on devices", "test", "device", "browser")]],
    ["S-MOB", "mobile_developer", "Users report that your app crashes on some Android phones only. How do you investigate?", [kp("Crash reports / logs", "crash report", "crashlytics", "logs", "logcat"), kp("Reproduce on device / version", "reproduce", "device", "android version", "emulator"), kp("Fix and release safely", "fix", "test", "staged rollout", "release")]],
    ["S-QA", "qa_engineer", "A developer says your bug is 'not a bug'. How do you handle it?", [kp("Evidence and steps to reproduce", "steps", "reproduce", "screenshot", "evidence", "log"), kp("Refer to requirements", "requirement", "acceptance criteria", "specification"), kp("Stay professional / involve PO", "product owner", "discuss", "professional", "agree")]],
    ["S-DEVOPS", "devops_engineer", "A deployment just broke production. What do you do in the first 15 minutes?", [kp("Roll back / restore service", "rollback", "roll back", "restore", "previous version"), kp("Communicate", "communicate", "inform", "status", "team"), kp("Investigate after", "logs", "monitor", "root cause", "post-mortem")]],
    ["S-DA", "data_analyst", "Your dashboard shows sales dropped 40% overnight. What do you check first?", [kp("Check data quality / pipeline", "data quality", "pipeline", "missing", "refresh", "source"), kp("Compare segments / dates", "segment", "region", "compare", "date"), kp("Confirm before reporting", "confirm", "validate", "stakeholder")]],
    ["S-DS", "data_scientist", "Your model has 95% accuracy in testing but performs badly after deployment. Why might that be?", [kp("Data drift / different data", "drift", "distribution", "different data", "real world"), kp("Leakage / bad split", "leakage", "split", "overfit"), kp("Monitor and retrain", "monitor", "retrain", "feedback")]],
    ["S-BA", "business_analyst", "Two stakeholders ask for conflicting requirements. How do you resolve it?", [kp("Understand each need", "understand", "why", "goal", "need"), kp("Bring them together / facilitate", "meeting", "facilitate", "together", "workshop"), kp("Decide using priority / sponsor", "priorit", "sponsor", "business value", "trade-off")]],
    ["S-UX", "ui_ux_designer", "A stakeholder insists on a design you believe hurts usability. What do you do?", [kp("Use evidence / data", "evidence", "data", "research", "test"), kp("Propose a test / compromise", "a/b", "usability test", "compromise", "prototype"), kp("Respectful communication", "listen", "respect", "explain")]],
    ["S-NET", "network_engineer", "Users in one office cannot access the internet but others can. How do you troubleshoot?", [kp("Layered approach", "physical", "layer", "osi", "cable"), kp("Check IP / DNS / gateway", "ip", "dns", "gateway", "dhcp", "ping"), kp("Isolate the device / switch", "switch", "vlan", "router", "isolate")]],
    ["S-SEC", "cybersecurity_analyst", "An employee clicked a phishing link. What steps do you take?", [kp("Contain the device / account", "isolate", "disconnect", "reset password", "contain"), kp("Investigate scope", "investigate", "logs", "scope", "other users"), kp("Report and educate", "report", "awareness", "training", "educate")]],
    ["S-PM", "project_coordinator", "The client wants a new feature one week before the deadline. How do you respond?", [kp("Assess impact", "impact", "assess", "estimate"), kp("Offer options", "option", "later release", "trade-off", "scope"), kp("Agree in writing / change control", "change request", "agree", "document", "approve")]]
  ].map(([id, role, prompt, points]) => ({
    id: id as string,
    type: "situational" as const,
    skillId: null,
    roleIds: [role as string],
    level: 2 as const,
    prompt: prompt as string,
    keyPoints: points as KeyPoint[],
    modelAnswer:
      "Show a calm, step-by-step approach: first protect users / the work, then gather facts, involve the right people, decide using evidence, and say how you would prevent it next time.",
    minWords: 50,
    idealWords: 130
  }))
];
