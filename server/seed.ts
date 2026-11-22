import { getDb } from './db.ts';
import { hashPassword } from './auth.ts';
import { ensurePdfFile } from './pdfGenerator.ts';

export async function seedDatabase(): Promise<void> {
  const db = getDb();

  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || (isProduction ? '' : 'admin@ktustudyhub.local');
  const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || (isProduction ? '' : 'KTUAdmin@2024');
  if (!adminEmail || !adminPass) {
    throw new Error('Set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD before starting in production.');
  }
  if (isProduction && adminPass.length < 16) {
    throw new Error('DEFAULT_ADMIN_PASSWORD must be at least 16 characters in production.');
  }

  // Check if already seeded
  const existingUni = db.prepare('SELECT id FROM universities WHERE code = ?').get('KTU') as { id: number } | undefined;
  if (existingUni) {
    if (isProduction) {
      const existingAdmin = db.prepare('SELECT id FROM admins ORDER BY id LIMIT 1').get() as { id: number } | undefined;
      const passwordHash = hashPassword(adminPass);
      if (existingAdmin) {
        db.prepare('UPDATE admins SET email = ?, password_hash = ? WHERE id = ?').run(
          adminEmail,
          passwordHash,
          existingAdmin.id
        );
      } else {
        db.prepare('INSERT INTO admins (email, name, password_hash, role) VALUES (?, ?, ?, ?)').run(
          adminEmail,
          'KTU Study Hub Admin',
          passwordHash,
          'superadmin'
        );
      }
    }
    return;
  }

  // 1. Admin user
  db.prepare(
    'INSERT INTO admins (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(adminEmail, 'KTU Study Hub Admin', hashPassword(adminPass), 'superadmin');

  // 2. Hierarchy
  const uniRes = db.prepare(
    'INSERT INTO universities (name, code, short_name) VALUES (?, ?, ?)'
  ).run('APJ Abdul Kalam Technological University', 'KTU', 'KTU');
  const uniId = Number(uniRes.lastInsertRowid);

  const schemeRes = db.prepare(
    'INSERT INTO schemes (university_id, name, year, is_active) VALUES (?, ?, ?, ?)'
  ).run(uniId, '2024 Scheme', 2024, 1);
  const schemeId = Number(schemeRes.lastInsertRowid);

  const ayCurrentRes = db.prepare(
    'INSERT INTO academic_years (label, start_year, end_year, is_current) VALUES (?, ?, ?, ?)'
  ).run('2025-26', 2025, 2026, 1);
  const ayCurrentId = Number(ayCurrentRes.lastInsertRowid);

  db.prepare(
    'INSERT INTO academic_years (label, start_year, end_year, is_current) VALUES (?, ?, ?, ?)'
  ).run('2024-25', 2024, 2025, 0);

  const cseRes = db.prepare(
    'INSERT INTO branches (name, code, short_name, description) VALUES (?, ?, ?, ?)'
  ).run(
    'Computer Science and Engineering',
    'CSE',
    'CSE',
    'B.Tech Computer Science and Engineering — KTU 2024 Scheme Group A'
  );
  const cseId = Number(cseRes.lastInsertRowid);

  db.prepare(
    'INSERT INTO branches (name, code, short_name, description) VALUES (?, ?, ?, ?)'
  ).run(
    'Information Technology',
    'IT',
    'IT',
    'B.Tech Information Technology (ready for branch-specific subjects)'
  );
  db.prepare(
    'INSERT INTO branches (name, code, short_name, description) VALUES (?, ?, ?, ?)'
  ).run(
    'Artificial Intelligence & Data Science',
    'AD',
    'AI & DS',
    'B.Tech AI & Data Science (ready for branch-specific subjects)'
  );

  db.prepare('INSERT INTO semesters (number, label, code) VALUES (?, ?, ?)').run(1, 'Semester 1 (S1)', 'S1');
  db.prepare('INSERT INTO semesters (number, label, code) VALUES (?, ?, ?)').run(2, 'Semester 2 (S2)', 'S2');
  const s3Res = db.prepare('INSERT INTO semesters (number, label, code) VALUES (?, ?, ?)').run(3, 'Semester 3 (S3)', 'S3');
  const s3Id = Number(s3Res.lastInsertRowid);
  db.prepare('INSERT INTO semesters (number, label, code) VALUES (?, ?, ?)').run(4, 'Semester 4 (S4)', 'S4');

  // 3. All S3 CSE Subjects under KTU 2024 Scheme
  const insertSubject = db.prepare(`
    INSERT INTO subjects (
      university_id, scheme_id, academic_year_id, branch_id, semester_id,
      code, name, short_description, course_type, credits, cie_marks, ese_marks,
      content_focus, syllabus_summary, is_published, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const oopId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'PBCST304',
      'Object Oriented Programming',
      'Project-Based Learning (PBL) course covering Java fundamentals, OOP principles, inheritance, interfaces, exception handling, SOLID principles, Swing GUI, and JDBC.',
      'Theory + PBL',
      4,
      60,
      40,
      'programming',
      'KTU 2024 Scheme S3 Core PBL Course. Evaluation: 60 Marks Continuous Internal Evaluation (CIE) + 40 Marks End Semester Exam (ESE, 2.5 hrs).',
      1
    ).lastInsertRowid
  );

  const mathId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'GAMAT301',
      'Mathematics for Computer and Information Science 3',
      'Probability distributions, discrete and continuous random variables, limit theorems, stochastic processes, and Markov chains.',
      'Theory (Group A)',
      3,
      40,
      60,
      'mathematical',
      'KTU 2024 Scheme S3 Mathematics (Group A). Covers probability models, limit theorems, and Markov chains.',
      2
    ).lastInsertRowid
  );

  const tocId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'PCCST302',
      'Theory of Computation',
      'Finite automata (DFA/NFA), regular languages, context-free grammars, pushdown automata, Turing machines, and decidability.',
      'Theory',
      4,
      40,
      60,
      'theory',
      'KTU 2024 Scheme S3 Core Theory. Covers automata theory, formal grammars, and computability.',
      3
    ).lastInsertRowid
  );

  const dsaId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'PCCST303',
      'Data Structures and Algorithms',
      'Asymptotic analysis, stacks, queues, linked lists, trees (BST, AVL, heaps), graphs (BFS/DFS), sorting, and searching.',
      'Theory',
      4,
      40,
      60,
      'programming',
      'KTU 2024 Scheme S3 Core Computer Science. Focuses on linear & non-linear data structures and algorithmic efficiency.',
      4
    ).lastInsertRowid
  );

  const deldId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'GAEST305',
      'Digital Electronics and Logic Design',
      'Number systems, Boolean algebra, K-maps, combinational circuits, flip-flops, counters, memory devices, and HDL concepts.',
      'Theory',
      4,
      40,
      60,
      'numerical',
      'KTU 2024 Scheme S3 Engineering Science. Covers logic minimization, combinational & sequential digital circuits.',
      5
    ).lastInsertRowid
  );

  const econId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'UCHUT346',
      'Economics for Engineers',
      'Economic principles, demand & supply, production, cost analysis, market structures, and engineering project evaluation.',
      'Theory (HMC)',
      2,
      40,
      60,
      'theory',
      'KTU 2024 Scheme Humanities & Management Course option for S3.',
      6
    ).lastInsertRowid
  );

  const ethicsId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'UCHUT347',
      'Engineering Ethics and Sustainable Development',
      'Professional engineering ethics, ethical theories, safety & responsibility, environmental sustainability, and green engineering.',
      'Theory (HMC)',
      2,
      40,
      60,
      'theory',
      'KTU 2024 Scheme Humanities & Management Course option for S3.',
      7
    ).lastInsertRowid
  );

  const dsaLabId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'PCCSL307',
      'Data Structures Lab',
      'Practical C/C++ implementation of arrays, stacks, queues, linked lists, trees, graphs, sorting, and searching algorithms.',
      'Practical Lab',
      2,
      50,
      50,
      'programming',
      'KTU 2024 Scheme S3 Programme Core Practical Lab paired with PCCST303.',
      8
    ).lastInsertRowid
  );

  const digitalLabId = Number(
    insertSubject.run(
      uniId,
      schemeId,
      ayCurrentId,
      cseId,
      s3Id,
      'PCCSL308',
      'Digital Lab',
      'Practical implementation and verification of logic gates, adders, multiplexers, flip-flops, shift registers, and counters.',
      'Practical Lab',
      2,
      50,
      50,
      'diagram',
      'KTU 2024 Scheme S3 Programme Core Practical Lab paired with GAEST305.',
      9
    ).lastInsertRowid
  );

  // 4. Configure Modules for Non-OOP Subjects (accurate KTU 2024 structure)
  const insertModule = db.prepare(`
    INSERT INTO modules (subject_id, module_number, title, description, syllabus_text, estimated_hours, is_published)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const otherSubjectModules: Array<{ subjectId: number; modules: Array<[number, string, string]> }> = [
    {
      subjectId: mathId,
      modules: [
        [1, 'Discrete Random Variables & Distributions', 'Discrete random variables, probability mass function, expectation, variance, Binomial & Poisson distributions, joint discrete distributions.'],
        [2, 'Continuous Random Variables & Distributions', 'Probability density function, Uniform, Exponential & Normal distributions, joint continuous probability density functions.'],
        [3, 'Limit Theorems & Stochastic Processes', 'Markov and Chebyshev inequalities, Law of Large Numbers, Central Limit Theorem, introduction to stochastic and Poisson processes.'],
        [4, 'Markov Chains & Long-Run Behaviour', 'Markov chains, transition probability matrices, random walk model, Chapman-Kolmogorov equations, classification of states, stationary distributions.'],
      ],
    },
    {
      subjectId: tocId,
      modules: [
        [1, 'Finite Automata & Regular Expressions', 'Alphabets, strings, languages, Deterministic Finite Automata (DFA), Nondeterministic Finite Automata (NFA), NFA to DFA conversion, Regular Expressions.'],
        [2, 'Regular Language Properties & Context-Free Grammars', 'Closure properties of regular languages, Pumping Lemma for regular languages, Context-Free Grammars (CFG), parse trees, ambiguity, Chomsky Normal Form.'],
        [3, 'Pushdown Automata & Context-Free Languages', 'Pushdown Automata (PDA), equivalence of PDA and CFG, deterministic PDA, Pumping Lemma for CFLs.'],
        [4, 'Turing Machines & Computability', 'Standard Turing Machine model, variants of TM, recursive and recursively enumerable languages, halting problem, undecidability overview.'],
      ],
    },
    {
      subjectId: dsaId,
      modules: [
        [1, 'Algorithm Analysis & Linear Data Structures', 'Asymptotic notations (Big-O, Omega, Theta), time & space complexity, arrays, stacks, queues, circular queues, infix-to-postfix conversion.'],
        [2, 'Linked Lists & Applications', 'Singly linked list, doubly linked list, circular linked list, polynomial representation and addition, memory allocation concepts.'],
        [3, 'Trees, BST, AVL & Heaps', 'Binary trees, tree traversals (inorder, preorder, postorder), Binary Search Trees (BST), AVL trees & rotations, binary heaps & priority queues.'],
        [4, 'Graphs, Sorting & Searching', 'Graph representations (adjacency matrix & list), BFS, DFS, Merge Sort, Quick Sort, Heap Sort, Linear & Binary Search, Hashing basics.'],
      ],
    },
    {
      subjectId: deldId,
      modules: [
        [1, 'Number Systems & Logic Minimization', 'Number conversions, signed representations, binary codes, Boolean algebra theorems, logic gates, K-map minimization, Quine-McCluskey method.'],
        [2, 'Combinational Logic Circuits', 'Half/Full adders, subtractors, ripple carry adders, encoders, decoders, multiplexers, demultiplexers, magnitude comparators.'],
        [3, 'Sequential Logic Circuits', 'Latches, SR/JK/D/T flip-flops, master-slave flip-flops, excitation tables, shift registers, synchronous and asynchronous counters.'],
        [4, 'Memory Devices & Programmable Logic', 'ROM, RAM (SRAM/DRAM), Programmable Logic Devices (PLA, PAL, PROM), introduction to Hardware Description Languages (HDL).'],
      ],
    },
    {
      subjectId: econId,
      modules: [
        [1, 'Basic Economic Concepts & Demand Analysis', 'Micro vs macroeconomics, scarcity, opportunity cost, law of demand & supply, elasticity of demand.'],
        [2, 'Production, Cost & Revenue Analysis', 'Production function, law of variable proportions, fixed & variable costs, break-even analysis.'],
        [3, 'Market Structures & Pricing', 'Perfect competition, monopoly, monopolistic competition, oligopoly, pricing strategies.'],
        [4, 'Engineering Economics & Project Evaluation', 'Time value of money, NPV, IRR, payback period, depreciation, inflation basics.'],
      ],
    },
    {
      subjectId: ethicsId,
      modules: [
        [1, 'Fundamentals of Engineering Ethics', 'Morals, values, integrity, work ethics, civic virtue, professional roles and responsibilities.'],
        [2, 'Ethical Theories & Decision Making', 'Utilitarianism, duty ethics, rights ethics, virtue ethics, Kohlberg & Gilligan models, resolving ethical dilemmas.'],
        [3, 'Safety, Risk & Workplace Rights', 'Engineering as social experimentation, safety and risk assessment, intellectual property rights, confidentiality, whistleblowing.'],
        [4, 'Sustainable Development & Global Issues', 'UN Sustainable Development Goals (SDGs), environmental ethics, sustainable technology, circular economy, global engineering ethics.'],
      ],
    },
    {
      subjectId: dsaLabId,
      modules: [
        [1, 'Linear Data Structures Experiments', 'Implementation of sparse matrix, stack, queue, circular queue, double-ended queue, infix to postfix evaluation.'],
        [2, 'Linked List & Tree Experiments', 'Implementation of singly/doubly linked lists, polynomial arithmetic, binary search tree operations & traversals.'],
        [3, 'Graph, Sorting & Hashing Experiments', 'Implementation of BFS/DFS, Quick Sort, Merge Sort, Heap Sort, and hash table collision resolution.'],
      ],
    },
    {
      subjectId: digitalLabId,
      modules: [
        [1, 'Basic Gates & Combinational Circuits', 'Verification of logic gates, Boolean expressions, half/full adder, subtractor, multiplexer & demultiplexer circuits.'],
        [2, 'Sequential Circuits & Counters', 'Verification of SR, JK, D, T flip-flops, shift registers, ripple counters, and synchronous counters.'],
      ],
    },
  ];

  for (const item of otherSubjectModules) {
    for (const [num, title, desc] of item.modules) {
      insertModule.run(item.subjectId, num, title, desc, desc, 10);
    }
  }

  // 5. FULL POPULATED SUBJECT: PBCST304 Object Oriented Programming (All 4 Modules)
  const oopMod1Id = Number(
    insertModule.run(
      oopId,
      1,
      'Introduction to Java & OOP Basics',
      'Java runtime (JDK, JRE, JVM), primitive & wrapper types, arrays, strings, Vector, operators, control flow, varargs, OOP vs procedural paradigms, classes, objects, constructors, access modifiers, and this keyword.',
      'Structure of a simple Java program, Java programming and runtime environment (Command Line & IDE), Java compiler, JVM, Primitive data types and Wrapper types, Type casting, Autoboxing, Arrays, Strings, Vector class, Arithmetic/Bitwise/Relational/Logical/Assignment/Ternary operators, Operator precedence, Selection/Iteration/Jump statements, Functions, Command line arguments, Variable length arguments (varargs), Data abstraction, Encapsulation, Inheritance, Polymorphism, Procedural vs Object-Oriented paradigms, Microservices overview, Declaring objects, Object references, Methods, Constructors, Access modifiers, this keyword.',
      12
    ).lastInsertRowid
  );

  const oopMod2Id = Number(
    insertModule.run(
      oopId,
      2,
      'Polymorphism, Inheritance & Advanced Class Features',
      'Method overloading, passing/returning objects, recursion, static & final members, inner classes, inheritance types, super keyword, constructor calling order, method overriding, and dynamic method dispatch.',
      'Method overloading, Using objects as parameters, Returning objects, Recursion, Static members, Final variables, Inner classes, Superclass, Subclass, Types of inheritance, super keyword, Protected members, Calling order of constructors, Method overriding, Dynamic method dispatch, Using final with inheritance.',
      11
    ).lastInsertRowid
  );

  const oopMod3Id = Number(
    insertModule.run(
      oopId,
      3,
      'Packages, Interfaces, Exception Handling & Design Patterns',
      'Defining & importing packages, CLASSPATH, access protection, abstract classes vs interfaces, extending interfaces, exception hierarchy, try-catch-finally, throw/throws, custom exceptions, Singleton & Adapter patterns.',
      'Defining a package, CLASSPATH, Access protection, Importing packages, Interfaces vs Abstract classes, Defining and implementing interfaces, Accessing implementations through interface references, Extending interfaces, Checked & unchecked exceptions, try-catch-finally, Multiple catch, Nested try, throw, throws, Built-in & Custom exceptions, Introduction to Design Patterns in Java (Singleton and Adapter).',
      11
    ).lastInsertRowid
  );

  const oopMod4Id = Number(
    insertModule.run(
      oopId,
      4,
      'SOLID Principles, Swing GUI & JDBC Connectivity',
      'SOLID object-oriented design principles, Java Swing components & layouts, Model-View-Controller (MVC), event-driven GUI programming, and JDBC database connectivity for CRUD operations.',
      'SOLID design principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion), Introduction to Java Swing, MVC architecture, Layout managers, Event handling mechanisms (ActionListener, MouseListener, etc.), JDBC drivers, Connection, Statement, PreparedStatement, ResultSet, CRUD operations.',
      11
    ).lastInsertRowid
  );

  // 6. Topics for OOP Modules 1–4
  const insertTopic = db.prepare(`
    INSERT INTO topics (subject_id, module_id, title, slug, summary, importance, content_type, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const m1t1 = Number(insertTopic.run(oopId, oopMod1Id, 'Java Compilation, JVM & Bytecode', 'jvm-bytecode', 'How javac compiles .java source into platform-independent .class bytecode executed by the JVM.', 'must_study', 'diagram', 1).lastInsertRowid);
  const m1t2 = Number(insertTopic.run(oopId, oopMod1Id, 'Data Types, Wrapper Classes & Autoboxing', 'datatypes-autoboxing', '8 primitive types, explicit/implicit type casting, wrapper classes, autoboxing & unboxing.', 'important', 'theory', 2).lastInsertRowid);
  const m1t3 = Number(insertTopic.run(oopId, oopMod1Id, 'Arrays, Strings, Vector & Varargs', 'arrays-strings-vector', '1D/2D arrays, immutable String vs StringBuilder, Vector class, command-line args, varargs (...).', 'important', 'programming', 3).lastInsertRowid);
  const m1t4 = Number(insertTopic.run(oopId, oopMod1Id, 'OOP Pillars & Procedural vs OOP', 'oop-pillars', 'Abstraction, Encapsulation, Inheritance, Polymorphism, and microservices context.', 'must_study', 'theory', 4).lastInsertRowid);
  const m1t5 = Number(insertTopic.run(oopId, oopMod1Id, 'Classes, Objects, Constructors & this Keyword', 'classes-constructors-this', 'Object creation with new, default/parameterized constructors, access modifiers, and this reference.', 'must_study', 'programming', 5).lastInsertRowid);

  const m2t1 = Number(insertTopic.run(oopId, oopMod2Id, 'Method Overloading & Recursion', 'overloading-recursion', 'Compile-time polymorphism via parameter signatures, passing/returning objects, recursion.', 'must_study', 'programming', 1).lastInsertRowid);
  const m2t2 = Number(insertTopic.run(oopId, oopMod2Id, 'static, final & Inner Classes', 'static-final-inner', 'Class-level static fields/methods/blocks, final constants/methods/classes, member & local inner classes.', 'important', 'theory', 2).lastInsertRowid);
  const m2t3 = Number(insertTopic.run(oopId, oopMod2Id, 'Inheritance, super & Constructor Order', 'inheritance-super', 'extends keyword, single/multilevel/hierarchical inheritance, super(), protected members.', 'must_study', 'diagram', 3).lastInsertRowid);
  const m2t4 = Number(insertTopic.run(oopId, oopMod2Id, 'Method Overriding & Dynamic Method Dispatch', 'overriding-dispatch', 'Runtime polymorphism where superclass reference invokes subclass overridden method.', 'must_study', 'programming', 4).lastInsertRowid);

  const m3t1 = Number(insertTopic.run(oopId, oopMod3Id, 'Packages, CLASSPATH & Access Protection', 'packages-classpath', 'Organizing classes into namespaces, CLASSPATH resolution, and 4 access levels across packages.', 'important', 'theory', 1).lastInsertRowid);
  const m3t2 = Number(insertTopic.run(oopId, oopMod3Id, 'Abstract Classes vs Interfaces', 'abstract-vs-interface', 'Partial vs full abstraction, implements keyword, multiple interface inheritance, default methods.', 'must_study', 'theory', 2).lastInsertRowid);
  const m3t3 = Number(insertTopic.run(oopId, oopMod3Id, 'Exception Handling & Custom Exceptions', 'exception-handling', 'Throwable hierarchy, checked vs unchecked, try-catch-finally, throw vs throws, user-defined exceptions.', 'must_study', 'diagram', 3).lastInsertRowid);
  const m3t4 = Number(insertTopic.run(oopId, oopMod3Id, 'Design Patterns: Singleton & Adapter', 'singleton-adapter', 'Creational Singleton (single instance) and Structural Adapter (interface bridging) patterns in Java.', 'important', 'programming', 4).lastInsertRowid);

  const m4t1 = Number(insertTopic.run(oopId, oopMod4Id, 'SOLID Design Principles', 'solid-principles', 'S-O-L-I-D object-oriented design rules for maintainable, loosely coupled Java code.', 'must_study', 'theory', 1).lastInsertRowid);
  const m4t2 = Number(insertTopic.run(oopId, oopMod4Id, 'Java Swing, MVC & Layout Managers', 'swing-mvc-layouts', 'JFrame, JPanel, JButton, FlowLayout/BorderLayout/GridLayout, and Swing MVC architecture.', 'important', 'diagram', 2).lastInsertRowid);
  const m4t3 = Number(insertTopic.run(oopId, oopMod4Id, 'Event-Driven Programming in Swing', 'swing-events', 'Delegation Event Model: Event Source, Event Object, Event Listener (ActionListener, KeyListener).', 'must_study', 'programming', 3).lastInsertRowid);
  const m4t4 = Number(insertTopic.run(oopId, oopMod4Id, 'JDBC Architecture & CRUD Operations', 'jdbc-crud', 'DriverManager, Connection, Statement, PreparedStatement, ResultSet, and 5-step JDBC workflow.', 'must_study', 'programming', 4).lastInsertRowid);

  // 7. Generate Real PDFs for OOP Study Library
  const pdfSyllabus = await ensurePdfFile({
    filename: 'PBCST304-KTU-2024-Syllabus-Outline.pdf',
    title: 'PBCST304: Object Oriented Programming — Syllabus Outline',
    subtitle: 'APJ Abdul Kalam Technological University (KTU) | 2024 Scheme | S3 CSE (PBL)',
    badge: 'Official Syllabus Summary',
    disclaimer: 'Structured syllabus reference aligned with KTU 2024 Scheme S3 CSE curriculum (CIE: 60 Marks, ESE: 40 Marks, 4 Credits).',
    sections: [
      {
        heading: 'Course Evaluation Pattern (PBL Course)',
        body: [
          'Course Code: PBCST304 | Credits: 4 | Category: Project-Based Learning (PBL)',
          'Continuous Internal Evaluation (CIE): 60 Marks (includes internal tests, lab/assignments, and semester Java project).',
          'End Semester Examination (ESE): 40 Marks (Duration: 2.5 Hours, covering Modules 1 to 4).',
        ],
      },
      {
        heading: 'Module 1: Introduction to Java & OOP Basics',
        body: [
          '• Java program structure, Command Line & IDE execution, javac compiler, JVM & bytecode.',
          '• Primitive data types, Wrapper classes, type casting, autoboxing/unboxing.',
          '• Arrays, Strings, Vector class, Operators & precedence, Control flow statements.',
          '• Functions, Command-line arguments, Variable-length arguments (varargs).',
          '• Procedural vs OOP paradigms, Abstraction, Encapsulation, Inheritance, Polymorphism, Microservices intro.',
          '• Classes, Objects, Methods, Constructors, Access modifiers, this keyword.',
        ],
      },
      {
        heading: 'Module 2: Polymorphism, Inheritance & Advanced Class Features',
        body: [
          '• Method overloading, passing objects as parameters, returning objects, recursion.',
          '• Static members (variables, methods, blocks), final variables, inner classes.',
          '• Inheritance (Single, Multilevel, Hierarchical), super keyword, protected members, constructor calling order.',
          '• Method overriding, Dynamic method dispatch, using final with inheritance.',
        ],
      },
      {
        heading: 'Module 3: Packages, Interfaces, Exception Handling & Design Patterns',
        body: [
          '• Packages, CLASSPATH, access protection across packages, importing packages.',
          '• Abstract classes vs Interfaces, defining/implementing/extending interfaces.',
          '• Checked & unchecked exceptions, try-catch-finally, multiple catch, nested try, throw, throws, custom exceptions.',
          '• Introduction to Design Patterns in Java: Singleton and Adapter patterns.',
        ],
      },
      {
        heading: 'Module 4: SOLID Principles, Swing GUI & JDBC Connectivity',
        body: [
          '• SOLID Design Principles (SRP, OCP, LSP, ISP, DIP).',
          '• Java Swing GUI components, MVC architecture, Layout managers (Flow, Border, Grid).',
          '• Event-driven programming: Delegation Event Model and Listeners.',
          '• JDBC database connectivity: DriverManager, Connection, Statement, PreparedStatement, ResultSet, CRUD operations.',
        ],
      },
    ],
  });

  const pdfClassroomNotes = await ensurePdfFile({
    filename: 'PBCST304-Classroom-Reference-Notes-All-Modules.pdf',
    title: 'PBCST304 Object Oriented Programming — Complete Study Pack',
    subtitle: 'Modules 1 to 4 | Simplified Exam-Oriented Classroom Reference',
    badge: 'Simplified Study Notes (Student Companion)',
    disclaimer: 'Prepared as a concise, exam-oriented study companion for KTU S3 students. Always verify project rubrics with your faculty.',
    sections: [
      {
        heading: 'Module 1 Key Concepts: JVM, Classes & Constructors',
        body: [
          '1. Java Compilation Flow: Source (.java) -> javac Compiler -> Bytecode (.class) -> JVM executes on any OS (Write Once, Run Anywhere).',
          '2. JDK vs JRE vs JVM: JVM runs bytecode; JRE = JVM + core libraries; JDK = JRE + compiler (javac) & dev tools.',
          '3. Constructors initialize objects automatically when `new` is called. `this` resolves shadowing between instance variables and parameters.',
        ],
        code: `class Student {\n  String name;\n  Student(String name) {\n    this.name = name; // resolves shadowing\n  }\n}`,
      },
      {
        heading: 'Module 2 Key Concepts: Inheritance & Dynamic Dispatch',
        body: [
          '1. Method Overloading = same method name, different parameter list (compile-time).',
          '2. Method Overriding = subclass redefines superclass method with exact same signature (runtime).',
          '3. Dynamic Method Dispatch: A superclass reference holding a subclass object calls the overridden subclass method at runtime.',
        ],
        code: `class Shape { void draw() { System.out.println("Shape"); } }\nclass Circle extends Shape { void draw() { System.out.println("Circle"); } }\nShape s = new Circle(); s.draw(); // prints Circle`,
      },
      {
        heading: 'Module 3 Key Concepts: Interfaces, Exceptions & Patterns',
        body: [
          '1. Use `abstract class` for IS-A partial abstraction with state; use `interface` for CAN-DO contracts and multiple inheritance.',
          '2. Exception Handling: `try` guards risky code, `catch` handles errors, `finally` always runs cleanup, `throw` raises an exception, `throws` declares checked exceptions.',
          '3. Singleton guarantees one instance via a private constructor and static `getInstance()`. Adapter converts an incompatible interface into an expected one.',
        ],
      },
      {
        heading: 'Module 4 Key Concepts: SOLID, Swing & JDBC',
        body: [
          '1. SOLID: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.',
          '2. Swing uses MVC + Delegation Event Model (Source -> Event -> Listener).',
          '3. JDBC 5 Steps: Load Driver -> Get Connection -> Create PreparedStatement -> Execute Query/Update -> Close Resources.',
        ],
      },
    ],
  });

  const pdfHandwrittenCheat = await ensurePdfFile({
    filename: 'PBCST304-Quick-Syntax-Formula-Sheet.pdf',
    title: 'PBCST304 Quick Syntax & Last-Minute Exam Sheet',
    subtitle: 'Compact Revision Sheet — Keywords, Comparisons & Snippets',
    badge: 'Quick Revision Sheet (Sample Study Aid)',
    disclaimer: 'Compact exam-eve revision summary covering high-yield syntax, access modifier table, and JDBC boilerplate.',
    sections: [
      {
        heading: 'Access Modifiers Matrix',
        body: [
          'private: Same Class ONLY.',
          'default (no keyword): Same Class + Same Package.',
          'protected: Same Class + Same Package + Subclass in any package.',
          'public: Accessible everywhere.',
        ],
      },
      {
        heading: 'Important Java Snippets for 5–7 Mark Questions',
        body: ['Custom Exception Template & Singleton Template:'],
        code: `class InvalidAgeException extends Exception {\n  InvalidAgeException(String msg) { super(msg); }\n}\n\nclass Singleton {\n  private static Singleton instance;\n  private Singleton() {}\n  public static Singleton getInstance() {\n    if (instance == null) instance = new Singleton();\n    return instance;\n  }\n}`,
      },
      {
        heading: 'JDBC 5-Step Exam Boilerplate',
        body: ['Remember: Connection -> PreparedStatement -> ResultSet -> close()'],
        code: `Connection con = DriverManager.getConnection(url, user, pass);\nPreparedStatement ps = con.prepareStatement("SELECT * FROM student WHERE id=?");\nps.setInt(1, 101);\nResultSet rs = ps.executeQuery();\nwhile (rs.next()) { System.out.println(rs.getString("name")); }\ncon.close();`,
      },
    ],
  });

  const pdfSampleModelPaper = await ensurePdfFile({
    filename: 'PBCST304-Sample-Practice-Model-Paper.pdf',
    title: 'PBCST304 Object Oriented Programming — Practice Model Paper',
    subtitle: 'Sample Practice Set (Syllabus-Aligned | ESE 40 Marks Pattern)',
    badge: 'Practice Material (Sample — Not Official KTU Paper)',
    disclaimer: 'DISCLAIMER: This is a syllabus-aligned practice question paper generated for exam preparation, NOT an official KTU past examination paper.',
    sections: [
      {
        heading: 'Part A — Short Answer Practice Questions (Modules 1–4)',
        body: [
          '1. Explain how bytecode and JVM make Java platform-independent. (3 Marks)',
          '2. Differentiate between autoboxing and unboxing with a small Java example. (3 Marks)',
          '3. What is the difference between `super` and `this` keywords? (3 Marks)',
          '4. Distinguish between `throw` and `throws` in Java exception handling. (3 Marks)',
          '5. State the Open/Closed Principle (OCP) in SOLID design with an example. (3 Marks)',
        ],
      },
      {
        heading: 'Part B — Descriptive & Programming Practice Questions',
        body: [
          '6. (Module 1) Write a Java program using a `Student` class with overloaded constructors and a method to display student details. Explain access modifiers. (7 Marks)',
          '7. (Module 2) Explain Dynamic Method Dispatch with a Java program using a Shape superclass and Circle/Rectangle subclasses. (7 Marks)',
          '8. (Module 3) Write a Java program to create a user-defined exception `InsufficientBalanceException` for a BankAccount class. (7 Marks)',
          '9. (Module 4) Explain the 5 steps of JDBC connectivity and write a Java snippet to insert and display records using `PreparedStatement`. (7 Marks)',
        ],
      },
    ],
  });

  // 8. Insert Resources (Exam-Friendly Notes, Syllabus, PDFs, Model Practice Paper)
  const insertResource = db.prepare(`
    INSERT INTO resources (
      subject_id, module_id, topic_id, academic_year_id, scheme_id, semester_id,
      title, description, resource_type, source_category, importance, content_format,
      exam_type, exam_year, content_markdown, diagram_key, file_url, file_name, file_size_bytes, mime_type, is_published
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  // Simplified Exam-Friendly Notes for Module 1
  insertResource.run(
    oopId,
    oopMod1Id,
    m1t1,
    ayCurrentId,
    schemeId,
    s3Id,
    'Module 1 Simplified Exam Notes: Java Basics, JVM & OOP Fundamentals',
    'Ultra-clear, bullet-point exam notes covering JVM, JDK vs JRE, data types, arrays/Strings/Vector, operators, OOP pillars, classes, constructors, and this keyword.',
    'exam_notes',
    'simplified_ai_notes',
    'must_study',
    'markdown',
    null,
    null,
    `## 1. How Java Runs (JVM & Bytecode) — Must Study

- **Source Code (\`.java\`)** → Compiled by \`javac\` → **Bytecode (\`.class\`)** → Executed by **JVM (Java Virtual Machine)**.
- **Why Java is Platform Independent:** Bytecode is the same on Windows, Linux, and macOS. Only the **JVM** is platform-specific.
- **WORA:** *Write Once, Run Anywhere*.

| Component | Full Form | What it contains | Who uses it? |
| :--- | :--- | :--- | :--- |
| **JVM** | Java Virtual Machine | Executes \`.class\` bytecode line by line (Interpreter + JIT) | Runtime engine |
| **JRE** | Java Runtime Environment | **JVM + Core Class Libraries** | End users running Java apps |
| **JDK** | Java Development Kit | **JRE + Compiler (\`javac\`) + Debugger + Tools** | Developers writing & compiling code |

---

## 2. Data Types, Type Casting & Wrapper Classes

- **8 Primitive Types:** \`byte\` (1B), \`short\` (2B), \`int\` (4B), \`long\` (8B), \`float\` (4B), \`double\` (8B), \`char\` (2B Unicode), \`boolean\` (1 bit logical).
- **Type Casting:**
  - *Widening (Implicit):* Smaller → Larger (\`int\` → \`double\`). Safe, automatic.
  - *Narrowing (Explicit):* Larger → Smaller (\`double d = 9.8; int x = (int) d;\`). May lose precision.
- **Wrapper Classes:** Object forms of primitives (\`int\` → \`Integer\`, \`char\` → \`Character\`, \`double\` → \`Double\`). Needed for collections like \`Vector\`.
- **Autoboxing:** Automatic conversion from primitive → Wrapper (\`Integer a = 10;\`).
- **Unboxing:** Automatic conversion from Wrapper → primitive (\`int b = a;\`).

---

## 3. Arrays, Strings, Vector & Varargs

- **Arrays:** Fixed-size homogeneous collection stored as an object (\`int[] arr = new int[5];\`).
- **String:** Immutable sequence of characters (\`String s = "KTU";\`). Any modification creates a new object in the String Pool.
- **Vector (\`java.util.Vector\`):** Dynamic, growable, synchronized array of objects. Unlike arrays, it grows automatically when elements are added.
- **Command-Line Arguments:** Passed via \`public static void main(String[] args)\` as \`args[0]\`, \`args[1]\`, etc.
- **Varargs (Variable-Length Arguments):** Allows passing 0 or more arguments using \`...\` syntax: \`void sum(int... nums)\` (must be the **last** parameter).

---

## 4. Procedural vs Object-Oriented Programming (4 Pillars)

| Feature | Procedural (e.g., C) | Object-Oriented (e.g., Java) |
| :--- | :--- | :--- |
| **Focus** | Functions / procedures | Objects & data |
| **Data Security** | Less secure (global data) | High (encapsulation & access modifiers) |
| **Approach** | Top-down | Bottom-up |
| **Code Reuse** | Limited | Strong via Inheritance & Polymorphism |

**4 Core OOP Pillars (Exam Favourite):**
1. **Encapsulation:** Wrapping data (variables) + code (methods) in a class and hiding data with \`private\` + getters/setters.
2. **Abstraction:** Showing essential features while hiding internal implementation details.
3. **Inheritance:** One class acquiring properties and methods of another (\`extends\`).
4. **Polymorphism:** One name, many forms (Method Overloading & Method Overriding).
- **Microservices Context:** Large OOP apps can be split into small, independent, loosely coupled services communicating over APIs.

---

## 5. Classes, Objects, Constructors & \`this\` Keyword

- **Class:** Blueprint/template. **Object:** Instance created in heap memory using \`new\`.
- **Constructor:** Special method with the **same name as the class** and **no return type**. Runs automatically when an object is created.
  - *Default Constructor:* No parameters.
  - *Parameterized Constructor:* Accepts arguments to initialize fields.
- **\`this\` Keyword:** Refers to the **current object**. Used to resolve naming conflicts (\`this.id = id;\`) and call another constructor (\`this(...)\`).
- **Access Modifiers:** \`private\` (class only), \`default\` (package), \`protected\` (package + subclasses), \`public\` (everywhere).`,
    'jvm-architecture',
    null,
    null,
    null,
    null
  );

  // Module 2 Exam-Friendly Notes
  insertResource.run(
    oopId,
    oopMod2Id,
    m2t3,
    ayCurrentId,
    schemeId,
    s3Id,
    'Module 2 Simplified Exam Notes: Overloading, static/final, Inheritance & Dynamic Dispatch',
    'Clear exam-ready notes on Method Overloading vs Overriding, static/final, Inner Classes, super keyword, Constructor calling order, and Runtime Polymorphism.',
    'exam_notes',
    'simplified_ai_notes',
    'must_study',
    'markdown',
    null,
    null,
    `## 1. Method Overloading & Passing/Returning Objects — Must Study

- **Method Overloading (Compile-Time Polymorphism):** Multiple methods in the same class share the **same name** but differ in **number, type, or order of parameters**.
- *Exam Trap:* Changing **only the return type** does NOT overload a method — it causes a compile error.
- **Objects as Parameters & Return Values:** Java passes object references by value, so methods can read/modify object state and return newly created objects.
- **Recursion:** A method calling itself with a **base condition** to prevent \`StackOverflowError\`.

---

## 2. \`static\`, \`final\` & Inner Classes

- **\`static\` Keyword (Belongs to the Class, not individual objects):**
  - \`static\` variable: Shared single copy across all objects (e.g., \`collegeCode\`).
  - \`static\` method: Called via \`ClassName.method()\`; **cannot directly access non-static variables or \`this\`**.
  - \`static\` block: Runs **once** when the class is loaded into memory.
- **\`final\` Keyword (Restriction):**
  - \`final\` variable → **Constant** (cannot be reassigned).
  - \`final\` method → **Cannot be overridden** by subclasses.
  - \`final\` class → **Cannot be inherited** (e.g., \`String\`).
- **Inner Class:** A class defined inside another class. Can directly access even \`private\` members of the outer class.

---

## 3. Inheritance, \`super\` & Constructor Calling Order — Must Study

- **Inheritance (\`extends\`):** Subclass acquires fields and methods of Superclass.
- **Supported Types in Java Classes:** Single, Multilevel, Hierarchical. (*Multiple inheritance of classes is NOT supported via \`extends\` to avoid the Diamond Problem; use Interfaces instead.*)
- **\`super\` Keyword:**
  1. \`super.var\` → Access parent class hidden variable.
  2. \`super.method()\` → Call parent class overridden method.
  3. \`super(args)\` → Call parent class constructor (**must be the first statement** in subclass constructor).
- **Constructor Calling Order:** Always **Top-Down** (Superclass constructor runs **first**, then Subclass constructor).

---

## 4. Method Overriding & Dynamic Method Dispatch

| Feature | Method Overloading | Method Overriding |
| :--- | :--- | :--- |
| **Where** | Same class (or subclass) | Parent & Child classes (Inheritance) |
| **Parameters** | Must be different | Must be identical |
| **Binding Time** | Compile-time (Static) | Runtime (Dynamic) |
| **Return Type** | Can differ | Same (or covariant subtype) |
| **Private/Static/Final** | Can be overloaded | Cannot be overridden |

- **Dynamic Method Dispatch (Runtime Polymorphism):** When a **Superclass reference variable** holds a **Subclass object** (\`Animal a = new Dog();\`), Java decides **at runtime** which overridden method to execute based on the actual object type (\`Dog\`).`,
    'inheritance-dispatch',
    null,
    null,
    null,
    null
  );

  // Module 3 Exam-Friendly Notes
  insertResource.run(
    oopId,
    oopMod3Id,
    m3t3,
    ayCurrentId,
    schemeId,
    s3Id,
    'Module 3 Simplified Exam Notes: Packages, Interfaces, Exceptions & Design Patterns',
    'Concise exam notes on Packages & CLASSPATH, Abstract Class vs Interface, Exception Hierarchy, Custom Exceptions, and Singleton & Adapter Patterns.',
    'exam_notes',
    'simplified_ai_notes',
    'must_study',
    'markdown',
    null,
    null,
    `## 1. Packages & CLASSPATH

- **Package:** A folder/namespace that groups related classes and avoids naming conflicts (e.g., \`package university.cse;\` must be the **first line** of the file).
- **\`CLASSPATH\`:** Environment variable or \`-cp\` flag telling the Java compiler and JVM where to locate \`.class\` files and packages.
- **Importing:** \`import pkg.ClassName;\` or \`import pkg.*;\`.

| Access Modifier | Same Class | Same Package | Subclass (Other Pkg) | Other Pkg (Non-Sub) |
| :--- | :---: | :---: | :---: | :---: |
| \`private\` | Yes | No | No | No |
| \`default\` | Yes | Yes | No | No |
| \`protected\` | Yes | Yes | Yes | No |
| \`public\` | Yes | Yes | Yes | Yes |

---

## 2. Abstract Classes vs Interfaces — Must Study

| Basis | Abstract Class | Interface |
| :--- | :--- | :--- |
| **Keyword** | \`abstract class\` / \`extends\` | \`interface\` / \`implements\` |
| **Methods** | Both abstract & concrete methods | Abstract by default (+ \`default\`/\`static\` in Java 8+) |
| **Variables** | Instance, static, final, non-final | Implicitly \`public static final\` (constants) |
| **Constructors** | Yes | No |
| **Multiple Inheritance** | No (only 1 class) | Yes (a class can \`implement\` multiple interfaces) |

- **Interface Reference:** \`Drawable d = new Circle();\` allows polymorphism across unrelated classes.
- **Extending Interfaces:** \`interface Printable extends Drawable { ... }\`.

---

## 3. Exception Handling — Must Study

- **Exception:** Unexpected runtime event that disrupts normal program flow.
- **Hierarchy:** \`Object\` → \`Throwable\` → \`Error\` (JVM fatal, don't catch) & \`Exception\`.
  - **Checked Exceptions (Compile-time):** Must handle with \`try-catch\` or \`throws\` (e.g., \`IOException\`, \`SQLException\`).
  - **Unchecked Exceptions (Runtime):** Subclasses of \`RuntimeException\` (e.g., \`ArithmeticException\`, \`NullPointerException\`, \`ArrayIndexOutOfBoundsException\`).
- **5 Keywords:**
  - \`try\`: Block containing code that might throw an exception.
  - \`catch\`: Handles specific exception (place child exception before parent!).
  - \`finally\`: Always executes (cleanup like closing files/DB), except \`System.exit(0)\`.
  - \`throw\`: Manually throws a single exception object inside a method.
  - \`throws\`: Declares exception types a method might pass to its caller.
- **Custom Exception:** Extend \`Exception\` (checked) or \`RuntimeException\` (unchecked) and pass message via \`super(msg)\`.

---

## 4. Design Patterns: Singleton & Adapter

- **Singleton Pattern (Creational):** Ensures a class has **only one object instance** globally (e.g., Database Connection Manager, Logger).
  - *3 Rules:* \`private\` constructor + \`private static\` instance + \`public static getInstance()\`.
- **Adapter Pattern (Structural):** Acts as a translator between **two incompatible interfaces** (e.g., a 3-pin plug adapter, or wrapping a legacy payment class to match a new \`PaymentGateway\` interface).`,
    'exception-hierarchy',
    null,
    null,
    null,
    null
  );

  // Module 4 Exam-Friendly Notes
  insertResource.run(
    oopId,
    oopMod4Id,
    m4t1,
    ayCurrentId,
    schemeId,
    s3Id,
    'Module 4 Simplified Exam Notes: SOLID Principles, Swing MVC & JDBC',
    'High-yield exam guide for the 5 SOLID principles, Java Swing layouts & event listeners, and the 5-step JDBC CRUD workflow.',
    'exam_notes',
    'simplified_ai_notes',
    'must_study',
    'markdown',
    null,
    null,
    `## 1. SOLID Design Principles — Must Study

1. **S — Single Responsibility Principle (SRP):** A class should have **only one reason to change** (one job). *Bad:* \`Student\` class handling both marks calculation and PDF printing.
2. **O — Open/Closed Principle (OCP):** Open for **extension**, closed for **modification**. Add new features via subclasses/interfaces instead of editing tested \`if-else\` blocks.
3. **L — Liskov Substitution Principle (LSP):** A subclass object must safely replace a superclass object without breaking expected behaviour.
4. **I — Interface Segregation Principle (ISP):** Don't force a class to implement huge interfaces with methods it doesn't use — split into small focused interfaces.
5. **D — Dependency Inversion Principle (DIP):** High-level modules should depend on **abstractions (interfaces)**, not concrete low-level classes.

---

## 2. Java Swing & MVC Architecture

- **Swing (\`javax.swing.*\`):** Lightweight, platform-independent GUI toolkit built on top of AWT.
- **Common Components:** \`JFrame\` (window), \`JPanel\` (container), \`JLabel\`, \`JTextField\`, \`JButton\`, \`JTable\`.
- **Layout Managers:**
  - \`FlowLayout\`: Left-to-right row wrapping (default for \`JPanel\`).
  - \`BorderLayout\`: 5 regions — \`NORTH\`, \`SOUTH\`, \`EAST\`, \`WEST\`, \`CENTER\` (default for \`JFrame\`).
  - \`GridLayout(rows, cols)\`: Equal-sized grid cells.
- **MVC in Swing:**
  - **Model:** Application data/state.
  - **View:** Visual UI components.
  - **Controller:** Event listeners handling user actions.

---

## 3. Event-Driven Programming (Delegation Event Model)

- **3 Parts:**
  1. **Event Source:** Component generating event (e.g., \`JButton\`).
  2. **Event Object:** Encapsulates event details (e.g., \`ActionEvent\`).
  3. **Event Listener:** Interface receiving & handling event (e.g., \`ActionListener\` with \`actionPerformed(ActionEvent e)\`).
- **Registration:** \`btn.addActionListener(this);\`

---

## 4. JDBC (Java Database Connectivity) — Must Study

- **JDBC:** Standard Java API (\`java.sql.*\`) to connect and execute SQL queries on relational databases.
- **5 Standard Steps in Every JDBC Program:**
  1. **Load/Register Driver:** \`Class.forName("com.mysql.cj.jdbc.Driver");\` (auto-loaded in modern JDBC 4+).
  2. **Establish Connection:** \`Connection con = DriverManager.getConnection(url, user, pass);\`
  3. **Create Statement:** \`PreparedStatement ps = con.prepareStatement("...");\` (prevents SQL injection!).
  4. **Execute Query:** \`executeQuery()\` for \`SELECT\` (returns \`ResultSet\`); \`executeUpdate()\` for \`INSERT/UPDATE/DELETE\` (returns affected row count).
  5. **Close Connection:** \`rs.close(); ps.close(); con.close();\` (or try-with-resources).`,
    'jdbc-architecture',
    null,
    null,
    null,
    null
  );

  // Additional Diagram Resources for visual study
  insertResource.run(
    oopId,
    oopMod4Id,
    m4t2,
    ayCurrentId,
    schemeId,
    s3Id,
    'Swing MVC & Delegation Event Model — Visual Diagram Guide',
    'Visual diagram explaining how Swing separates Model, View, and Controller with Event Listeners.',
    'diagram',
    'simplified_ai_notes',
    'important',
    'markdown',
    null,
    null,
    `## Swing MVC & Event Flow\n\n- User clicks a \`JButton\` (**View / Event Source**).\n- Swing creates an \`ActionEvent\` and dispatches it to the registered \`ActionListener\` (**Controller**).\n- Controller updates the **Model** data and refreshes the **View**.`,
    'swing-mvc',
    null,
    null,
    null,
    null
  );

  // Attach Real Generated PDF Resources
  insertResource.run(
    oopId,
    null,
    null,
    ayCurrentId,
    schemeId,
    s3Id,
    'PBCST304 Official KTU 2024 Scheme Syllabus Outline (PDF)',
    'Complete 4-module syllabus breakdown, course outcomes, and CIE/ESE evaluation pattern for PBCST304.',
    'syllabus',
    'official_document',
    'must_study',
    'pdf',
    null,
    null,
    null,
    null,
    pdfSyllabus.fileUrl,
    pdfSyllabus.fileName,
    pdfSyllabus.fileSizeBytes,
    'application/pdf'
  );

  insertResource.run(
    oopId,
    oopMod1Id,
    null,
    ayCurrentId,
    schemeId,
    s3Id,
    'PBCST304 Classroom Reference Notes — Modules 1 to 4 (PDF)',
    'Downloadable classroom-style study pack summarizing core Java OOP concepts and code patterns across all 4 modules.',
    'original_notes',
    'faculty_notes',
    'must_study',
    'pdf',
    null,
    null,
    null,
    null,
    pdfClassroomNotes.fileUrl,
    pdfClassroomNotes.fileName,
    pdfClassroomNotes.fileSizeBytes,
    'application/pdf'
  );

  insertResource.run(
    oopId,
    oopMod3Id,
    null,
    ayCurrentId,
    schemeId,
    s3Id,
    'OOP Quick Syntax, Access Matrix & JDBC Study Sheet (PDF)',
    'Compact handwritten-style reference sheet for last-minute revision of modifiers, exceptions, Singleton, and JDBC.',
    'handwritten_notes',
    'original_student_notes',
    'important',
    'pdf',
    null,
    null,
    null,
    null,
    pdfHandwrittenCheat.fileUrl,
    pdfHandwrittenCheat.fileName,
    pdfHandwrittenCheat.fileSizeBytes,
    'application/pdf'
  );

  insertResource.run(
    oopId,
    null,
    null,
    ayCurrentId,
    schemeId,
    s3Id,
    'PBCST304 Syllabus-Aligned Practice Model Paper (Sample PDF)',
    'Sample 40-mark End Semester practice question paper structured around Modules 1–4. Clearly marked as practice material (not an official KTU past paper).',
    'model_paper',
    'practice_material',
    'must_study',
    'pdf',
    'model',
    '2024-25 Practice',
    null,
    null,
    pdfSampleModelPaper.fileUrl,
    pdfSampleModelPaper.fileName,
    pdfSampleModelPaper.fileSizeBytes,
    'application/pdf'
  );

  // 9. Questions & Solved Answers (All 8 categories represented!)
  const insertQuestion = db.prepare(`
    INSERT INTO questions (
      subject_id, module_id, topic_id, question_text, question_type,
      marks, difficulty, importance, source_label, source_category, exam_year,
      is_solved, is_important, is_published
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)
  `);

  const insertAnswer = db.prepare(`
    INSERT INTO answers (
      question_id, short_answer, detailed_explanation, code_snippet, code_language,
      formula_text, diagram_key, expected_marks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const qaList: Array<{
    moduleId: number;
    topicId: number;
    q: string;
    type: string;
    marks: number;
    diff: string;
    imp: string;
    importantFlag: number;
    shortAns: string;
    detail: string;
    code?: string;
    diagram?: string;
  }> = [
    {
      moduleId: oopMod1Id,
      topicId: m1t1,
      q: 'Explain how Java achieves platform independence using bytecode and the JVM.',
      type: 'diagram',
      marks: 4,
      diff: 'easy',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'The javac compiler converts Java source code (.java) into platform-neutral bytecode (.class). Each OS has its own JVM that interprets/JIT-compiles this same bytecode into native machine code.',
      detail:
        '1. Write code once in a `.java` file.\n2. Run `javac Main.java` to produce `Main.class` containing intermediate bytecode instructions.\n3. Any OS with a JVM (Windows, Linux, macOS) loads the `.class` file, verifies bytecode security, and executes it on the host CPU.',
      diagram: 'jvm-architecture',
    },
    {
      moduleId: oopMod1Id,
      topicId: m1t2,
      q: 'Define Autoboxing and Unboxing in Java with a code example.',
      type: 'definition',
      marks: 3,
      diff: 'easy',
      imp: 'important',
      importantFlag: 1,
      shortAns:
        'Autoboxing is the automatic conversion of a primitive type into its corresponding Wrapper class object (e.g., int -> Integer). Unboxing is the reverse automatic conversion (Integer -> int).',
      detail:
        'Introduced in Java 5 so primitives can be stored directly in object-based collections like `Vector` or `ArrayList` without manual `Integer.valueOf()` calls.',
      code: `int x = 25;\nInteger obj = x; // Autoboxing\nint y = obj;     // Unboxing\nSystem.out.println(obj + " " + y);`,
    },
    {
      moduleId: oopMod1Id,
      topicId: m1t5,
      q: 'What is a constructor? Explain the use of the `this` keyword inside a constructor.',
      type: 'short_answer',
      marks: 3,
      diff: 'easy',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'A constructor is a special block with the same name as the class and no return type, invoked automatically during object creation to initialize fields. `this` refers to the current object and resolves variable shadowing.',
      detail:
        'Two key uses of `this`: (1) `this.field = field` distinguishes instance fields from local parameters; (2) `this(args)` chains another constructor within the same class (must be the first line).',
      code: `class Book {\n  String title;\n  Book() { this("Untitled"); }\n  Book(String title) { this.title = title; }\n}`,
    },
    {
      moduleId: oopMod1Id,
      topicId: m1t3,
      q: 'Trace the output of the following Java snippet using varargs and arrays.',
      type: 'numerical',
      marks: 3,
      diff: 'medium',
      imp: 'important',
      importantFlag: 0,
      shortAns: 'Output: Count=3, Sum=12',
      detail:
        'Varargs `int... v` packs arguments into an integer array `v`. `v.length` is 3 (for 2, 4, 6), and the enhanced for-loop adds `2 + 4 + 6 = 12`.',
      code: `static void calc(int... v) {\n  int sum = 0;\n  for (int n : v) sum += n;\n  System.out.println("Count=" + v.length + ", Sum=" + sum);\n}\n// Call: calc(2, 4, 6);`,
    },
    {
      moduleId: oopMod2Id,
      topicId: m2t4,
      q: 'Compare Method Overloading and Method Overriding in Java.',
      type: 'comparison',
      marks: 4,
      diff: 'easy',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'Overloading occurs within a class with same method name and different parameter lists (compile-time). Overriding occurs in inheritance where a subclass redefines a superclass method with the exact same signature (runtime).',
      detail:
        'Key exam points:\n- Binding: Overloading is static/early binding; Overriding is dynamic/late binding.\n- Parameters: Must differ in overloading; must match in overriding.\n- Final/Static/Private methods: Can be overloaded, cannot be overridden.',
    },
    {
      moduleId: oopMod2Id,
      topicId: m2t3,
      q: 'Explain constructor calling order in multilevel inheritance with the `super` keyword.',
      type: 'descriptive',
      marks: 6,
      diff: 'medium',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'Constructors execute top-down from the highest superclass to the lowest subclass. `super(...)` explicitly passes arguments to the immediate parent constructor and must be the first statement.',
      detail:
        'When `new C()` is invoked where `C extends B` and `B extends A`, Java implicitly or explicitly calls `super()`, executing `A()` first, then `B()`, and finally `C()`. This ensures inherited state is initialized before child logic runs.',
      code: `class A { A() { System.out.println("A"); } }\nclass B extends A { B() { System.out.println("B"); } }\nclass C extends B { C() { System.out.println("C"); } }\n// new C() prints: A, then B, then C`,
      diagram: 'inheritance-dispatch',
    },
    {
      moduleId: oopMod2Id,
      topicId: m2t4,
      q: 'Write a Java program to demonstrate Dynamic Method Dispatch using an Employee hierarchy.',
      type: 'programming',
      marks: 7,
      diff: 'medium',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'Create a superclass `Employee` with `calculateSalary()`, override it in `Developer` and `Intern`, and invoke `calculateSalary()` via an `Employee` reference pointing to each subclass object.',
      detail:
        'Dynamic method dispatch resolves which overridden method to run at runtime based on the actual object in heap memory rather than the reference variable type.',
      code: `class Employee {\n  double calculateSalary() { return 20000; }\n}\nclass Developer extends Employee {\n  @Override double calculateSalary() { return 55000; }\n}\nclass Intern extends Employee {\n  @Override double calculateSalary() { return 15000; }\n}\npublic class DispatchDemo {\n  public static void main(String[] args) {\n    Employee e;\n    e = new Developer();\n    System.out.println("Developer: " + e.calculateSalary());\n    e = new Intern();\n    System.out.println("Intern: " + e.calculateSalary());\n  }\n}`,
    },
    {
      moduleId: oopMod3Id,
      topicId: m3t2,
      q: 'Differentiate between an Abstract Class and an Interface in Java.',
      type: 'comparison',
      marks: 4,
      diff: 'easy',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'An abstract class can have constructors, instance fields, and concrete methods (single inheritance via extends). An interface defines a pure contract with public static final constants and supports multiple inheritance via implements.',
      detail:
        'Choose an **abstract class** when subclasses share common state and code (IS-A relationship). Choose an **interface** when unrelated classes need to guarantee a common capability (CAN-DO relationship, e.g., `Comparable`, `Serializable`).',
    },
    {
      moduleId: oopMod3Id,
      topicId: m3t3,
      q: 'Illustrate the Java Exception Hierarchy and explain Checked vs Unchecked exceptions.',
      type: 'diagram',
      marks: 5,
      diff: 'easy',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        '`Throwable` is the root class with two branches: `Error` (unrecoverable JVM issues) and `Exception`. Checked exceptions are verified at compile time; Unchecked (`RuntimeException`) occur at runtime.',
      detail:
        'Checked exceptions (`IOException`, `SQLException`) force the programmer to use `try-catch` or `throws`. Unchecked exceptions (`ArithmeticException`, `NullPointerException`) are usually programming logic errors and do not require mandatory `throws` declarations.',
      diagram: 'exception-hierarchy',
    },
    {
      moduleId: oopMod3Id,
      topicId: m3t3,
      q: 'Write a Java program that defines and throws a custom exception `InvalidMarkException` when marks < 0 or > 100.',
      type: 'programming',
      marks: 7,
      diff: 'medium',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'Extend `Exception` with a constructor calling `super(message)`, throw `new InvalidMarkException(...)` during validation, and catch it in `main`.',
      detail:
        'Custom checked exceptions extend `java.lang.Exception`. Declaring `throws InvalidMarkException` on `validateMarks()` enforces handling at the call site.',
      code: `class InvalidMarkException extends Exception {\n  InvalidMarkException(String msg) { super(msg); }\n}\npublic class ExamCheck {\n  static void validate(int m) throws InvalidMarkException {\n    if (m < 0 || m > 100) throw new InvalidMarkException("Marks must be 0..100");\n    System.out.println("Valid marks: " + m);\n  }\n  public static void main(String[] args) {\n    try { validate(105); }\n    catch (InvalidMarkException e) { System.out.println("Error: " + e.getMessage()); }\n  }\n}`,
    },
    {
      moduleId: oopMod3Id,
      topicId: m3t4,
      q: 'Explain the Singleton and Adapter design patterns with a real-world Java problem.',
      type: 'problem_solving',
      marks: 7,
      diff: 'medium',
      imp: 'important',
      importantFlag: 1,
      shortAns:
        'Singleton ensures only one instance of a class exists (e.g., ConfigManager). Adapter wraps an incompatible existing class so it works with a new expected interface.',
      detail:
        'Use Singleton when shared state/resources must be centralized. Use Adapter when integrating a legacy class whose method names cannot be modified.',
      code: `class ConfigManager {\n  private static ConfigManager instance;\n  private ConfigManager() {}\n  public static ConfigManager getInstance() {\n    if (instance == null) instance = new ConfigManager();\n    return instance;\n  }\n}`,
    },
    {
      moduleId: oopMod4Id,
      topicId: m4t1,
      q: 'List and explain all five SOLID design principles with brief examples.',
      type: 'descriptive',
      marks: 7,
      diff: 'medium',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'SRP (Single Responsibility), OCP (Open/Closed), LSP (Liskov Substitution), ISP (Interface Segregation), DIP (Dependency Inversion).',
      detail:
        '- **SRP:** Separate `StudentRepository` (DB) from `StudentReport` (printing).\n- **OCP:** Support new shapes by adding classes implementing `Shape.area()` instead of modifying an `if-else` chain.\n- **LSP:** Don\'t let a subclass throw unexpected errors on parent methods.\n- **ISP:** Split `Worker` into `Workable` and `Eatable` so robots aren\'t forced to implement `eat()`.\n- **DIP:** Inject a `Database` interface into `OrderService` instead of hardcoding `MySQLDatabase`.',
    },
    {
      moduleId: oopMod4Id,
      topicId: m4t3,
      q: 'Build a simple Java Swing GUI application with a JTextField and JButton that greets the user on click.',
      type: 'programming',
      marks: 7,
      diff: 'medium',
      imp: 'important',
      importantFlag: 1,
      shortAns:
        'Use `JFrame` with `FlowLayout`, add `JTextField`, `JButton`, and `JLabel`, and attach an `ActionListener` to update the label when clicked.',
      detail:
        'Demonstrates Swing components, layout management, and the Delegation Event Model.',
      code: `import javax.swing.*;\nimport java.awt.*;\npublic class GreetApp {\n  public static void main(String[] args) {\n    JFrame f = new JFrame("Greeting");\n    f.setLayout(new FlowLayout());\n    JTextField tf = new JTextField(12);\n    JButton btn = new JButton("Greet");\n    JLabel out = new JLabel("Enter name");\n    btn.addActionListener(e -> out.setText("Hello, " + tf.getText()));\n    f.add(tf); f.add(btn); f.add(out);\n    f.setSize(300, 140);\n    f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);\n    f.setVisible(true);\n  }\n}`,
      diagram: 'swing-mvc',
    },
    {
      moduleId: oopMod4Id,
      topicId: m4t4,
      q: 'Explain the JDBC Architecture and write the 5 steps to perform a parameterized SELECT query.',
      type: 'descriptive',
      marks: 7,
      diff: 'medium',
      imp: 'must_study',
      importantFlag: 1,
      shortAns:
        'JDBC connects Java apps to databases via DriverManager and JDBC Drivers. Steps: (1) Load Driver, (2) Open Connection, (3) Create PreparedStatement, (4) Execute & process ResultSet, (5) Close resources.',
      detail:
        'Using `PreparedStatement` precompiles the SQL query and binds `?` parameters safely, preventing SQL Injection attacks compared to plain `Statement`.',
      code: `Connection con = DriverManager.getConnection("jdbc:mysql://localhost:3306/ktu", "root", "pass");\nPreparedStatement ps = con.prepareStatement("SELECT name FROM students WHERE sem = ?");\nps.setInt(1, 3);\nResultSet rs = ps.executeQuery();\nwhile (rs.next()) {\n  System.out.println(rs.getString("name"));\n}\ncon.close();`,
      diagram: 'jdbc-architecture',
    },
  ];

  for (const item of qaList) {
    const qRes = insertQuestion.run(
      oopId,
      item.moduleId,
      item.topicId,
      item.q,
      item.type,
      item.marks,
      item.diff,
      item.imp,
      'Syllabus-Aligned Practice Bank',
      'practice_material',
      null,
      item.importantFlag
    );
    const qId = Number(qRes.lastInsertRowid);
    insertAnswer.run(
      qId,
      item.shortAns,
      item.detail,
      item.code || null,
      'java',
      null,
      item.diagram || null,
      item.marks
    );
  }

  // 10. Programming Examples (Modules 1–4)
  const insertProgram = db.prepare(`
    INSERT INTO programs (
      subject_id, module_id, topic_id, title, description, problem_statement,
      language, code, sample_input, sample_output, explanation, importance, is_published
    ) VALUES (?, ?, ?, ?, ?, ?, 'java', ?, ?, ?, ?, ?, 1)
  `);

  const programsList = [
    {
      moduleId: oopMod1Id,
      topicId: m1t5,
      title: 'Student Class with Overloaded Constructors & `this` Keyword',
      desc: 'Demonstrates encapsulation, constructor overloading, and resolving variable shadowing.',
      problem: 'Create a Student class with rollNo, name, and cgpa. Provide default and parameterized constructors and a display() method.',
      code: `public class StudentDemo {
  static class Student {
    private int rollNo;
    private String name;
    private double cgpa;

    Student() {
      this(0, "Unknown", 0.0);
    }

    Student(int rollNo, String name, double cgpa) {
      this.rollNo = rollNo;
      this.name = name;
      this.cgpa = cgpa;
    }

    void display() {
      System.out.println(rollNo + " | " + name + " | CGPA: " + cgpa);
    }
  }

  public static void main(String[] args) {
    Student s1 = new Student();
    Student s2 = new Student(101, "Ananya", 8.95);
    s1.display();
    s2.display();
  }
}`,
      input: 'No runtime input required',
      output: `0 | Unknown | CGPA: 0.0\n101 | Ananya | CGPA: 8.95`,
      explanation: 'The default constructor delegates to the 3-argument constructor using `this(...)`, avoiding duplicate initialization code.',
      imp: 'must_study',
    },
    {
      moduleId: oopMod1Id,
      topicId: m1t3,
      title: 'Vector & Wrapper Autoboxing Demo',
      desc: 'Shows how Vector grows dynamically and stores primitive ints via autoboxing.',
      problem: 'Store integers in a java.util.Vector, remove an element, and print the remaining items.',
      code: `import java.util.Vector;

public class VectorDemo {
  public static void main(String[] args) {
    Vector<Integer> marks = new Vector<>();
    marks.add(85); // autoboxed int -> Integer
    marks.add(92);
    marks.add(78);
    marks.remove(Integer.valueOf(78));
    System.out.println("Size: " + marks.size());
    for (int m : marks) {
      System.out.println("Mark: " + m);
    }
  }
}`,
      input: 'Preloaded values: 85, 92, 78',
      output: `Size: 2\nMark: 85\nMark: 92`,
      explanation: 'Vector is synchronized and dynamically resizable. `Integer.valueOf(78)` removes by object value rather than index.',
      imp: 'important',
    },
    {
      moduleId: oopMod2Id,
      topicId: m2t1,
      title: 'Area Calculator Using Method Overloading',
      desc: 'Compile-time polymorphism with overloaded area() methods.',
      problem: 'Write overloaded area() methods for circle, rectangle, and triangle.',
      code: `public class AreaOverload {
  static double area(double r) {
    return Math.PI * r * r;
  }
  static double area(double l, double b) {
    return l * b;
  }
  static double area(double base, double height, boolean isTriangle) {
    return 0.5 * base * height;
  }

  public static void main(String[] args) {
    System.out.printf("Circle: %.2f%n", area(5.0));
    System.out.printf("Rectangle: %.2f%n", area(4.0, 6.0));
    System.out.printf("Triangle: %.2f%n", area(4.0, 6.0, true));
  }
}`,
      input: 'r=5.0, rect=4x6, tri=4x6',
      output: `Circle: 78.54\nRectangle: 24.00\nTriangle: 12.00`,
      explanation: 'The Java compiler picks the exact method at compile time based on the parameter count and types.',
      imp: 'must_study',
    },
    {
      moduleId: oopMod2Id,
      topicId: m2t4,
      title: 'Dynamic Method Dispatch with Shape Hierarchy',
      desc: 'Classic KTU exam program demonstrating runtime polymorphism.',
      problem: 'Define a Shape superclass with draw() and override it in Circle and Rectangle. Call via a Shape reference.',
      code: `class Shape {
  void draw() {
    System.out.println("Drawing generic shape");
  }
}
class Circle extends Shape {
  @Override
  void draw() { System.out.println("Drawing Circle"); }
}
class Rectangle extends Shape {
  @Override
  void draw() { System.out.println("Drawing Rectangle"); }
}
public class ShapeDispatch {
  public static void main(String[] args) {
    Shape[] shapes = { new Circle(), new Rectangle() };
    for (Shape s : shapes) {
      s.draw(); // Resolved dynamically at runtime
    }
  }
}`,
      input: 'Array of Circle and Rectangle instances',
      output: `Drawing Circle\nDrawing Rectangle`,
      explanation: 'Although the array type is `Shape[]`, JVM invokes the actual runtime subclass implementation of `draw()`.',
      imp: 'must_study',
    },
    {
      moduleId: oopMod3Id,
      topicId: m3t2,
      title: 'Multiple Inheritance Using Interfaces',
      desc: 'Shows how a class implements multiple interfaces cleanly in Java.',
      problem: 'Create Printable and Scannable interfaces and implement both in a SmartPrinter class.',
      code: `interface Printable {
  void printDoc(String doc);
}
interface Scannable {
  void scanDoc(String doc);
}
class SmartPrinter implements Printable, Scannable {
  public void printDoc(String doc) {
    System.out.println("Printing: " + doc);
  }
  public void scanDoc(String doc) {
    System.out.println("Scanning: " + doc);
  }
}
public class InterfaceDemo {
  public static void main(String[] args) {
    SmartPrinter sp = new SmartPrinter();
    sp.printDoc("OOP_Notes.pdf");
    sp.scanDoc("Lab_Record.pdf");
  }
}`,
      input: 'Document titles',
      output: `Printing: OOP_Notes.pdf\nScanning: Lab_Record.pdf`,
      explanation: 'Java avoids the diamond problem of multiple class inheritance by allowing a class to implement multiple interfaces.',
      imp: 'must_study',
    },
    {
      moduleId: oopMod3Id,
      topicId: m3t3,
      title: 'Custom Exception: Bank Withdrawal Validator',
      desc: 'User-defined checked exception with try-catch-finally.',
      problem: 'Throw InsufficientBalanceException if withdrawal exceeds balance.',
      code: `class InsufficientBalanceException extends Exception {
  InsufficientBalanceException(String msg) {
    super(msg);
  }
}
class BankAccount {
  private double balance = 5000;
  void withdraw(double amount) throws InsufficientBalanceException {
    if (amount > balance) {
      throw new InsufficientBalanceException("Requested " + amount + ", available " + balance);
    }
    balance -= amount;
    System.out.println("Withdrawn: " + amount + ", Remaining: " + balance);
  }
}
public class BankTest {
  public static void main(String[] args) {
    BankAccount acc = new BankAccount();
    try {
      acc.withdraw(2000);
      acc.withdraw(4000);
    } catch (InsufficientBalanceException e) {
      System.out.println("Caught Exception: " + e.getMessage());
    } finally {
      System.out.println("Transaction session closed.");
    }
  }
}`,
      input: 'Withdraw 2000, then 4000 from 5000 balance',
      output: `Withdrawn: 2000.0, Remaining: 3000.0\nCaught Exception: Requested 4000.0, available 3000.0\nTransaction session closed.`,
      explanation: 'The `finally` block executes regardless of whether the second withdrawal throws an exception.',
      imp: 'must_study',
    },
    {
      moduleId: oopMod3Id,
      topicId: m3t4,
      title: 'Adapter Pattern in Java (Legacy Media Player)',
      desc: 'Bridges an incompatible LegacyAudioPlayer interface to a ModernPlayer interface.',
      problem: 'Adapt LegacyAudioPlayer.playMp3() to work through ModernPlayer.play(type, file).',
      code: `interface ModernPlayer {
  void play(String format, String file);
}
class LegacyAudioPlayer {
  void playMp3(String file) {
    System.out.println("Playing MP3 via legacy player: " + file);
  }
}
class MediaAdapter implements ModernPlayer {
  private final LegacyAudioPlayer legacy = new LegacyAudioPlayer();
  public void play(String format, String file) {
    if ("mp3".equalsIgnoreCase(format)) {
      legacy.playMp3(file);
    } else {
      System.out.println("Unsupported format: " + format);
    }
  }
}
public class AdapterDemo {
  public static void main(String[] args) {
    ModernPlayer player = new MediaAdapter();
    player.play("mp3", "lecture1.mp3");
  }
}`,
      input: 'format="mp3", file="lecture1.mp3"',
      output: `Playing MP3 via legacy player: lecture1.mp3`,
      explanation: 'MediaAdapter translates `play()` calls into `playMp3()` without altering `LegacyAudioPlayer`.',
      imp: 'important',
    },
    {
      moduleId: oopMod4Id,
      topicId: m4t4,
      title: 'Complete JDBC CRUD Snippet with PreparedStatement',
      desc: 'Standard exam-ready JDBC Insert & Select pattern.',
      problem: 'Insert a student record and query all S3 students safely using PreparedStatement.',
      code: `import java.sql.*;

public class StudentJdbcDemo {
  public static void main(String[] args) {
    String url = "jdbc:mysql://localhost:3306/ktu_db";
    String user = "root";
    String pass = "password";

    try (Connection con = DriverManager.getConnection(url, user, pass)) {
      PreparedStatement ins = con.prepareStatement(
        "INSERT INTO students (id, name, sem) VALUES (?, ?, ?)"
      );
      ins.setInt(1, 101);
      ins.setString(2, "Karthik");
      ins.setInt(3, 3);
      ins.executeUpdate();

      PreparedStatement sel = con.prepareStatement("SELECT id, name FROM students WHERE sem = ?");
      sel.setInt(1, 3);
      ResultSet rs = sel.executeQuery();
      while (rs.next()) {
        System.out.println(rs.getInt("id") + " - " + rs.getString("name"));
      }
    } catch (SQLException e) {
      System.err.println("DB Error: " + e.getMessage());
    }
  }
}`,
      input: 'Database ktu_db with students(id, name, sem)',
      output: `101 - Karthik`,
      explanation: 'Try-with-resources automatically closes `Connection`, and `PreparedStatement` prevents SQL injection.',
      imp: 'must_study',
    },
  ];

  for (const p of programsList) {
    insertProgram.run(
      oopId,
      p.moduleId,
      p.topicId,
      p.title,
      p.desc,
      p.problem,
      p.code,
      p.input,
      p.output,
      p.explanation,
      p.imp
    );
  }

  // 11. Quick Revision Items across all 4 OOP Modules
  const insertRevision = db.prepare(`
    INSERT INTO revision_items (
      subject_id, module_id, topic_id, category, title, content_markdown, code_snippet, diagram_key, importance, sort_order, is_published
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const revItems = [
    [oopMod1Id, m1t1, 'definition', 'Bytecode & JVM', 'Bytecode is platform-independent `.class` code produced by `javac`. The JVM interprets/JIT-compiles bytecode into native CPU instructions.', null, 'jvm-architecture', 'must_study', 1],
    [oopMod1Id, m1t4, 'concept', '4 OOP Pillars (A-E-I-P)', '- **Abstraction:** Hide complexity.\n- **Encapsulation:** `private` fields + getters/setters.\n- **Inheritance:** Reuse via `extends`.\n- **Polymorphism:** Overloading & Overriding.', null, null, 'must_study', 2],
    [oopMod1Id, m1t5, 'syntax', 'Constructor & `this` Cheat Syntax', 'Same name as class, no return type. `this.x = x` resolves shadowing; `this()` chains constructor.', `class Box {\n  int w;\n  Box() { this(10); }\n  Box(int w) { this.w = w; }\n}`, null, 'must_study', 3],
    [oopMod2Id, m2t4, 'comparison', 'Overloading vs Overriding', '| Aspect | Overloading | Overriding |\n| :--- | :--- | :--- |\n| Params | Different | Identical |\n| Binding | Compile-time | Runtime |\n| Inheritance | Optional | Required |', null, null, 'must_study', 4],
    [oopMod2Id, m2t3, 'concept', 'Constructor Order & `super()`', 'Constructors execute **Superclass -> Subclass**. `super(args)` must be the **very first line** inside the subclass constructor.', `class Child extends Parent {\n  Child(int x) { super(x); }\n}`, 'inheritance-dispatch', 'must_study', 5],
    [oopMod2Id, m2t2, 'syntax', '`static` vs `final` Quick Rules', '- `static` = shared class copy; static methods cannot use `this` or `super`.\n- `final` variable = constant; `final` method = cannot override; `final` class = cannot inherit.', null, null, 'important', 6],
    [oopMod3Id, m3t2, 'comparison', 'Abstract Class vs Interface', '| Feature | Abstract Class | Interface |\n| :--- | :--- | :--- |\n| Keyword | `extends` (1 class) | `implements` (many) |\n| Constructors | Yes | No |\n| Fields | Any | `public static final` |', null, null, 'must_study', 7],
    [oopMod3Id, m3t3, 'concept', '5 Exception Keywords', '- `try`: Risky block.\n- `catch`: Handler.\n- `finally`: Always runs.\n- `throw`: Throws 1 exception object.\n- `throws`: Declares checked exceptions.', null, 'exception-hierarchy', 'must_study', 8],
    [oopMod3Id, m3t4, 'program', 'Singleton Pattern Template', 'Private constructor + static instance + `getInstance()` method.', `class DB {\n  private static DB obj;\n  private DB() {}\n  public static DB getInstance() {\n    if (obj == null) obj = new DB();\n    return obj;\n  }\n}`, null, 'important', 9],
    [oopMod4Id, m4t1, 'concept', 'SOLID Acronym Memory Hook', '- **S**ingle Responsibility (1 job per class)\n- **O**pen/Closed (extend, don\'t edit)\n- **L**iskov Substitution (child replaces parent safely)\n- **I**nterface Segregation (small focused interfaces)\n- **D**ependency Inversion (depend on abstractions)', null, null, 'must_study', 10],
    [oopMod4Id, m4t2, 'diagram', 'Swing Layouts & MVC', 'FlowLayout (JPanel default), BorderLayout (JFrame default: N/S/E/W/Center), GridLayout (rows x cols). Events flow: Source -> Event -> Listener.', null, 'swing-mvc', 'important', 11],
    [oopMod4Id, m4t4, 'syntax', 'JDBC 5-Step Checklist', '1. Driver -> 2. `DriverManager.getConnection()` -> 3. `prepareStatement()` -> 4. `executeQuery()` / `executeUpdate()` -> 5. `close()`.', null, 'jdbc-architecture', 'must_study', 12],
  ] as const;

  for (const r of revItems) {
    insertRevision.run(oopId, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]);
  }
}
