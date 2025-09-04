# Soutnancia - Final Year Project (PFE) Management System

## Overview

**Soutnancia** is a comprehensive platform designed to simplify the management of final-year projects (PFE) for students, teachers, and administrators. It streamlines team formation, project selection, and communication between the teams w/ the supervisors using an agile methodology, making the PFE process efficient and collaborative.

## Key Features

- ### Authentication
- ### Team Composition: Students can create or join project teams based on skills and preferences.
- ### Project Selection: Teams browse and apply for projects with multi-choices to assign projects to teams.
- ### Communication: Agile-based interaction for deliverables and feedback between teams and supervisors.
- ### Administration: Centralized management of users, ,levels,majors and project timelines

The system supports three user roles: Student, Teacher, and Administrator.

- ## Student Session
- ### Login & Profile Setup

Access the system through a secure login form.
On first login, a popup prompts students to set project preferences and skills (e.g., frontend development, backend development).

- ### Team Composition
- #### Creating a Team Offer

Students can create a team offer, specifying required skills (e.g., "Need frontend dev, backend dev").
The creator of the offer becomes the team leader.

- #### Joining a Team

Browse available team offers and apply based on matching skills and preferences.
The team leader reviews and approves or rejects applications.

- ### Project Selection
- #### For Team Leaders

Browse and filter project proposals.
Apply for a project on behalf of the team.
Projects are assigned based on administrator-defined criteria, which may include:

Teacher Approval: Teachers review and approve team applications.
Par Amiability: Teachers manually select teams for their projects.
Automated Assignment: first come - first served

- #### For Team Members

View project details once the project is assigned.

- ### Progress & Evaluation

Submit deliverables for review throughout the project lifecycle.
Receive feedback from teachers to track progress and improve.
defining the sprints and tasks for each one

- ## Teacher Session
- ### Project Proposals

Submit PFE project proposals for student teams.
View the history of past projects for reference.
Manage team applications by approving or rejecting them.

- ### Team Evaluation & Monitoring

Track team progress and review deliverables.
Provide feedback to ensure projects meet academic standards.

- ## Administrator Session
- ### User & Rights Management

Manage user accounts, update records..
Set timelines for team formation and project selection.
Configure academic settings, such as majors, levels and assignments type for projects for each level-major 


- ## System Benefits

Streamlined Workflow: Simplifies team formation, project assignment, and deliverable management.
Agile Methodology: Enhances communication and iterative progress tracking.
Role-Based Access: Ensures secure and appropriate access for students, teachers, and administrators.

## Technology Stack

- ### Frontend
**ReactJS**: A JavaScript library for building dynamic and interactive user interfaces.

**Axios**: For making HTTP requests to the backend API.

**React Query**: For efficient data fetching, caching..

**Tailwind CSS**: A utility-first CSS framework for rapid and responsive styling.

**Shadcn UI**: A collection of reusable, customizable UI components built with Tailwind CSS.

- ### Backend
**Node.js**: A JavaScript runtime for building scalable server-side applications.

**Express.js**: A framework for Node.js .

**Prisma**: An ORM for simplified database interactions and schema management.

**PostgreSQL**: A powerful, open-source relational database for storing and managing data.
