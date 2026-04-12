Here is the extracted markdown from the provided document, containing the complete submission guidelines and terms:

# [cite_start]NatWest Group: Code for Purpose - India Hackathon [cite: 69, 70]

## [cite_start]Submission Guidelines & Terms [cite: 71, 72]

[cite_start]These guidelines set out the expectations, standards and rules for student project submissions[cite: 73, 74]. [cite_start]Please read them carefully and ensure your project complies with all sections before submission[cite: 75].

---

## [cite_start]1. Required Submission Items [cite: 76]

### [cite_start]1.1 README.md (Project Documentation) [cite: 77]
[cite_start]Your README.md is the main documentation for your project[cite: 78]. [cite_start]It must be clear enough for someone unfamiliar with your work to understand and run it[cite: 78]. [cite_start]Your README must include[cite: 79]:

**i. [cite_start]Overview** [cite: 80]
[cite_start]A short description (2-5 sentences) explaining[cite: 82]:
* [cite_start]What your project does. [cite: 83]
* [cite_start]What problem it solves. [cite: 84]
* [cite_start]Who the intended users are. [cite: 85]

**ii. [cite_start]Features** [cite: 86]
* [cite_start]A bullet list of features that are implemented and working. [cite: 87]
* [cite_start]Do not list planned or future features as if they already exist. [cite: 88]

**iii. [cite_start]Install and run instructions** [cite: 89]
* [cite_start]Step-by-step instructions to install dependencies and run the project. [cite: 90]
* [cite_start]Assume the reader has basic technical skills but no prior knowledge of your code. [cite: 91]

**iv. [cite_start]Tech stack** [cite: 92]
[cite_start]List the main technologies used, e.g.,[cite: 93]:
* [cite_start]Programming languages. [cite: 94]
* [cite_start]Frameworks. [cite: 95]
* [cite_start]Databases. [cite: 96]
* [cite_start]Cloud services. [cite: 97]
* [cite_start]AI/ML libraries or models. [cite: 98]

**v. [cite_start]Usage examples** [cite: 100]
[cite_start]Show how to use the project once it is running[cite: 101, 102]. [cite_start]You may include[cite: 103]:
* [cite_start]Command examples [cite: 104]
* [cite_start]Example API calls [cite: 104]
* [cite_start]Sample inputs/outputs [cite: 105]
* [cite_start]Screenshots (if applicable) [cite: 106]

**vi. [cite_start]Optional but recommended sections** [cite: 107]
* [cite_start]Architecture notes: short explanation of how the system is structured (e.g., frontend, backend, database, external APIs). [cite: 108]
* [cite_start]Limitations: honest description of what does not work or is not fully implemented. [cite: 109]
* [cite_start]Future improvements: features or changes you would make with more time. [cite: 110]

---

## [cite_start]2. Codebase Requirements [cite: 111]
[cite_start]Your repository must contain everything needed to understand and run your project[cite: 112].

### [cite_start]2.1 Complete source code [cite: 113]
* [cite_start]Include all source files used by your project (e.g., .py, .js, .ts, .html, css, etc.). [cite: 115]
* [cite_start]Ensure no imported modules or files are missing. [cite: 116]
* [cite_start]Test by cloning your repository to a new location and following your own setup instructions. [cite: 117]

### [cite_start]2.2 Dependency files [cite: 118]
[cite_start]Provide the necessary configuration for installing dependencies, for example[cite: 119]:
* [cite_start]Python: requirements.txt or pyproject.toml [cite: 120]
* [cite_start]Node.js: package.json (and optionally package-lock.json or pnpm-lock.yaml/yarn.lock) [cite: 121]
* [cite_start]Conda: environment.yml [cite: 121]

[cite_start]These files must allow judges to install dependencies with standard commands such as[cite: 122]:
* [cite_start]`pip install -r requirements.txt` [cite: 123]
* [cite_start]`npm install` [cite: 124]
* [cite_start]`conda env create -f environment.yml` [cite: 125]

### [cite_start]2.3 Configuration files [cite: 126]
* [cite_start]Include configuration examples without exposing secrets. [cite: 127]
* [cite_start].env.example should list all required environment variables. [cite: 128]
* [cite_start]Do not include real passwords, API keys or confidential data. [cite: 128]
* [cite_start]You may also include Configuration folders (e.g., config/) and Settings files (e.g., settings.py, config.json). [cite: 129, 131, 132]

### [cite_start]2.4 Folder structure [cite: 133]
[cite_start]Avoid single-file projects[cite: 134]. [cite_start]Use a clear and logical structure, for example[cite: 134]:
* [cite_start]`project/` [cite: 135]
    * [cite_start]`src/` [cite: 136]
    * [cite_start]`tests/` [cite: 137]
    * [cite_start]`assets/` [cite: 138]
    * [cite_start]`README.md` [cite: 139]
    * [cite_start]`requirements.txt` [cite: 140]

[cite_start]Additional common directories include `docs/` for extra documentation and `scripts/` for helper or utility scripts[cite: 141, 142, 143]. [cite_start]A clean structure is required to help judges navigate your project quickly[cite: 144].

---

## [cite_start]3. Tests (optional but encouraged) [cite: 146]
[cite_start]Tests are optional but required if you want to be assessed on test coverage[cite: 147].
* [cite_start]Place tests in a tests/directory, or use filenames like test_*.py (Python) or *.test.js/*.spec.js (JavaScript/TypeScript). [cite: 147, 148, 149]
* [cite_start]Tests must be real and meaningful, not empty placeholders. [cite: 150]

---

## [cite_start]4. Feature Accuracy and Honesty [cite: 151]
* [cite_start]Your documentation must reflect the actual state of your project. [cite: 152]
* [cite_start]Every feature listed in the README must exist and be usable in the codebase. [cite: 153]
* [cite_start]Partially implemented or incomplete features must be clearly labelled as such. [cite: 154]

[cite_start]**Examples of accurate descriptions:** [cite: 155]
* [cite_start]"User registration is implemented with a basic form; email verification is not yet supported." [cite: 156]
* [cite_start]"The dashboard page is present, but charts are static and not connected to live data." [cite: 157]

[cite_start]Misrepresenting features or claiming work that has not been done may lead to disqualification[cite: 158].

---

## [cite_start]5. Code Quality Standards [cite: 159]
[cite_start]You are expected to follow basic open-source style and good engineering practices[cite: 160].

### [cite_start]5.1 Structure and organisation [cite: 161]
* [cite_start]Use a logical folder structure (see Section 2.4). [cite: 162]
* [cite_start]Avoid placing all logic in a single file (e.g., main.py, index.js). [cite: 163]

### [cite_start]5.2 Naming and comments [cite: 164]
* [cite_start]Use descriptive names for variables, functions and files (e.g., calculate_score, user_session, task_repository). [cite: 165]
* [cite_start]Avoid meaningless names (e.g., temp1, x2, data1). [cite: 165]
* [cite_start]Include helpful comments and docstrings: Explain "why" something is done or any non-obvious logic. [cite: 166, 167]
* [cite_start]Add docstrings for important functions, classes and modules. [cite: 167]

### [cite_start]5.3 Security and secrets [cite: 168]
* [cite_start]Do not hard code Usernames, Passwords, API keys, or Tokens. [cite: 170, 171, 172, 173, 174]
* [cite_start]Use environment variables and reference them in code. [cite: 175]
* [cite_start]Provide env.example instead of your real .env file. [cite: 176]

### [cite_start]5.4 Clean-up before submission [cite: 177]
[cite_start]Before submitting[cite: 178]:
* [cite_start]Remove unused files, temporary scripts and test data that are not needed. [cite: 179]
* [cite_start]Remove debugging code (e.g., stray print statements, console logs). [cite: 180]
* [cite_start]Remove local log files and output artefacts (e.g., debug.log, output.txt). [cite: 181]

[cite_start]Readable, straightforward code is preferred over unnecessarily complex or "clever" solutions[cite: 182].

---

## [cite_start]6. Highlighting Technical Depth (if applicable) [cite: 184]
[cite_start]If your project uses advanced technologies (e.g., AI, data pipelines, etc), you should provide a short explanation in the README covering[cite: 185, 186]:
* [cite_start]What technologies or techniques you used. [cite: 187]
* [cite_start]Why you chose them. [cite: 187]
* [cite_start]What problem they solve in your project. [cite: 188]

[cite_start]Optionally include simple diagrams (inline in the README or in a docs/ folder), such as[cite: 189]:
* [cite_start]System architecture diagrams (e.g., client → backend database → external API). [cite: 189]
* [cite_start]Data flow diagrams (e.g., input → processing output). [cite: 190]

[cite_start]**Example explanation:** [cite: 191]
[cite_start]We use a fine-tuned transformer model to classify user support tickets by topic[cite: 192]. [cite_start]This improves routing accuracy compared to keyword-based matching, which performed poorly in our tests[cite: 193].

[cite_start]This helps reviewers understand the complexity and innovation in your submission[cite: 194].

---

## [cite_start]7. Open-Source Compliance and DCO Terms [cite: 195]
[cite_start]These terms are mandatory for participation[cite: 196]. [cite_start]By submitting a project, you confirm that you comply with the following[cite: 196].

### [cite_start]7.1 Github accounts and commit sign-off [cite: 197]
* [cite_start]You may use your personal GitHub account. [cite: 197, 198]
* [cite_start]All commits must be compatible with Apache License 2.0 and the Developer Certificate of Origin (DCO). [cite: 198, 199, 200]
* [cite_start]You are responsible for following the hackathon instructions on commit sign-off (for example, using git commit -s and including the correct sign-off text). [cite: 201]

### [cite_start]7.2 Single email rule [cite: 202]
[cite_start]You must use a single email address for[cite: 203]:
* [cite_start]All Git commits. [cite: 204]
* [cite_start]All hackathon-related communication. [cite: 205]
* [cite_start]The entire duration of the event. [cite: 207]

[cite_start]This ensures consistent identification of your contributions[cite: 208].

### [cite_start]7.3 Identity and representation [cite: 209]
* [cite_start]Do not use fake identities, pseudonymous company personas or shared corporate GitHub users. [cite: 210]
* [cite_start]All contributions are made in a personal capacity and not as official company work, unless explicitly authorised and disclosed. [cite: 211]

### [cite_start]7.4 Licensing, policies and conflicts of interest [cite: 212]
[cite_start]You must[cite: 213]:
* [cite_start]Comply with the open-source policies. [cite: 214]
* [cite_start]Follow external open-source standards, including the DCO requirements. [cite: 215]
* [cite_start]Not disclose or use confidential or proprietary company information in your project. [cite: 216]
* [cite_start]Use personal devices for hackathon work unless company policy explicitly allows otherwise. [cite: 217]

### [cite_start]7.5 Repository visibility [cite: 219]
* [cite_start]During the hackathon, your GitHub repository must remain private. [cite: 220]
* [cite_start]After submission and review, repositories may be made public, as required by the event rules. [cite: 221]

### [cite_start]7.6 No plagiarism policy [cite: 222]
* [cite_start]All project work must be original to you and your team. [cite: 223]
* [cite_start]You must not copy other teams' work or reuse previous projects as if they were new submissions. [cite: 224]
* [cite_start]Using open-source libraries and frameworks is allowed, but your project must add original code, configuration and integration work. [cite: 225]
* [cite_start]You must respect licences of all third-party dependencies. [cite: 226]

[cite_start]Violation of these terms may result in disqualification[cite: 227].

---

## [cite_start]8. Recommended Learning Resources (optional) [cite: 228]
[cite_start]The following external courses are recommended to improve your understanding of open source, but they are not mandatory[cite: 229].

**i. [cite_start]Open-source contribution in finance (LFD137)** [cite: 230]
[cite_start]Topics include[cite: 231]:
* [cite_start]Risks of contributing in regulated environments [cite: 232]
* [cite_start]Safe contribution practices [cite: 233]
* [cite_start]Legal and compliance considerations [cite: 234]
* [cite_start]Link: [https://training.linuxfoundation.org/training/open-source-contribution-in-finance-Ifd137/](https://training.linuxfoundation.org/training/open-source-contribution-in-finance-Ifd137/) [cite: 235]

**ii. [cite_start]Beginner's guide to open-source software development (LFD102)** [cite: 236]
[cite_start]Topics include[cite: 237]:
* [cite_start]How open-source projects are structured and managed [cite: 238]
* [cite_start]Licensing and collaboration [cite: 239]
* [cite_start]Git, GitHub and CI/CD basics [cite: 240]
* [cite_start]Community norms and best practices [cite: 241]
* [cite_start]Link: [https://training.linuxfoundation.org/training/beginners-guide-open-source-software-development/](https://training.linuxfoundation.org/training/beginners-guide-open-source-software-development/) [cite: 242]

---

## [cite_start]9. Final Requirements and Expectations [cite: 243]
[cite_start]By submitting your project, you confirm that[cite: 244]:
* [cite_start]It is reasonably easy to install and run using the instructions you provide. [cite: 245]
* [cite_start]Your README clearly describes what the project does and how to use it. [cite: 246]
* [cite_start]The folder structure and code organisation are clear and navigable. [cite: 247]
* [cite_start]The features you claim are implemented and functional. [cite: 248]
* [cite_start]You have followed the code quality, security and compliance guidelines above. [cite: 249]

[cite_start]Clear documentation, clean code and honest representation of your work are essential requirements for a valid and strong submission[cite: 250].