# SchoolBridge System

Build the foundation of a secondary school management system using React and Supabase.

Database: create these tables in Supabase: users (id, email, role, full_name, phone, avatar_url, status — role is an enum: director, head_of_studies, head_of_discipline, nurse, teacher, economist, storekeeper, parent, student), classes (id, name, level, academic_year, head_teacher_id), subjects (id, name, code), class_subjects (class_id, subject_id, teacher_id), students (id, user_id, class_id, admission_number, dob, gender, guardian_name, guardian_phone), parent_student_links (parent_id, student_id, relationship), attendance_records (id, student_id, class_subject_id, date, status, recorded_by), evaluations (id, class_subject_id, term, type, date, max_score), grades (id, evaluation_id, student_id, score, remarks), discipline_records (id, student_id, type, description, date, severity, recorded_by, status), medical_visits (id, student_id, date, symptoms, diagnosis, treatment, notes, recorded_by), fee_structures (id, class_id, term, amount, due_date), fee_payments (id, student_id, term, amount_paid, date, method, receipt_number, recorded_by), expenses (id, category, amount, date, description, recorded_by), stock_items (id, name, category, unit, quantity_on_hand, reorder_threshold), stock_transactions (id, item_id, type, quantity, date, reason, recorded_by), notifications (id, user_id, message, read, created_at).

Auth & routing: Supabase email/password auth. After login, route each user to a role-specific dashboard shell based on their role, with a shared sidebar+header layout and a design system (dark/light mode, cohesive palette, card-based layout, clean typography) reused across all 9 roles. Each role's sidebar should show the correct nav items for that role even if most pages are placeholder ("coming soon") for now — I need the full navigation structure to exist for all 9 roles.

Fully build only these two dashboards, completely functional:

Head of studies / director shared area: create/edit classes, create/edit subjects, assign teachers to class-subjects, register new students (with class assignment), register new teacher/staff accounts with role selection, register parent accounts and link them to students. Show a students-per-class table and teachers-per-subject table.

Teacher dashboard: shows only the classes/subjects assigned to the logged-in teacher (via class_subjects). For each: take attendance per session, create evaluations, enter grades per student per evaluation with remarks.

Everything else stays as placeholder pages behind the correct role routing. Prioritize the schema, auth, routing, and design system being solid over any single dashboard being deep.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mindbloom-system.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/36748ec0-9ce2-42d6-a5af-71d40b9dd995).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
