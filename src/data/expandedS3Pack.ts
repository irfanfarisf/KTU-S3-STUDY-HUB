export interface ExpandedQuestion {
  topic: string;
  source?: string;
  diagramKey?: string;
  question: string;
  answer: string;
  type: 'short_answer' | 'descriptive' | 'definition' | 'programming' | 'numerical' | 'comparison' | 'diagram' | 'problem_solving';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  importance: 'must_study' | 'important' | 'additional';
  solved: boolean;
  detail?: string;
  formula?: string;
  code?: string;
  language?: string;
}

export interface ExpandedModule {
  topics: string[];
  mustStudy: string[];
  important: string[];
  additional: string[];
  evidence: string;
  addendum: string;
  questions: ExpandedQuestion[];
  revisions: Array<{ title: string; category: 'definition' | 'concept' | 'formula' | 'syntax' | 'comparison' | 'diagram' | 'program' | 'faq'; content: string; importance: 'must_study' | 'important' | 'additional'; code?: string; language?: string; diagramKey?: string }>;
}

// Priorities use the supplied official syllabus and the supplied 2025 PYQs
// where their question text is extractable. Questions are original study aids,
// not copied answers from commercial material.
export const EXPANDED_S3_PACK: Record<string, ExpandedModule[]> = {
  PBCST304: [
    {
      topics: ['JVM and Java execution', 'Operators and control flow', 'Classes and objects'],
      mustStudy: ['JVM/JIT execution and bytecode', 'bitwise and shift operators', 'classes, objects and constructors'],
      important: ['arrays, String and Vector', 'access control and this'], additional: ['wrapper classes and autoboxing'],
      evidence: 'The November 2025 PYQ directly asks about JIT and traces right-shift/unsigned-shift/complement output. The syllabus also covers Java basics and object construction.',
      addendum: "### Fast examples and exam cues\n- For int n = 29, binary is 11101; n >> 1 is 14, n >>> 1 is 14, and ~n is -30 for a 32-bit Java int.\n- A class declares fields/methods; each object stores its own instance state. this.x = x resolves a field/parameter name clash.\n- Exam order: compile with javac A.java → bytecode → JVM class loading, verification, interpretation/JIT compilation.\n- **Must Study:** JIT/bytecode, bitwise output tracing, class/object/constructor basics.\n- **Important:** arrays, String immutability, access modifiers, this.\n- **Additional:** wrapper conversions and Vector details.\n- Tier basis: the direct PYQ items above are Must Study; the remaining tiers reflect explicit syllabus breadth, not an invented frequency count.",
      questions: [
        { topic: 'Java operators', question: 'For `int n = 29`, find `n >> 1`, `n >>> 1` and `~n`. State the binary representation used.', answer: '`29` is `000...011101`. Both right shifts give `14`; the sign bit is zero. Java `~n` complements all 32 bits, so `~29 = -30` (equivalently `-n-1`).', type: 'numerical', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`~x = -x - 1` for Java signed integers' },
        { topic: 'JVM', source: 'KTU November 2025 PYQ — adapted JIT question', question: 'Define bytecode and Just-In-Time (JIT) compilation. How do they help Java execution?', answer: 'Bytecode is the platform-independent instruction code in a `.class` file. The JVM executes it. A JIT compiler translates frequently used bytecode into native machine code while the program runs, which can speed up repeated execution.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Classes and objects', question: 'Compare a class and an object. Give a small Java example.', answer: 'A class is a type/blueprint; an object is one runtime instance with its own field values. Example: `class Lamp { boolean on; }` then `Lamp a = new Lamp();` creates an object.', type: 'comparison', marks: 3, difficulty: 'easy', importance: 'important', solved: false },
        { topic: 'Constructors and this', question: 'Write a Java class with a constructor that stores a student name, and explain the role of `this`.', answer: 'The constructor runs when the object is created. `this.name` means the current object’s field, while `name` on the right is the parameter.', type: 'programming', marks: 5, difficulty: 'medium', importance: 'important', solved: false, code: 'class Student {\n  String name;\n  Student(String name) { this.name = name; }\n}', language: 'java' },
      ],
      revisions: [
        { title: 'JVM in one line', category: 'concept', content: '`.java` → `javac` → `.class` bytecode → JVM verifies, loads and executes; JIT compiles hot code to native instructions.', importance: 'must_study' },
        { title: 'Java bitwise reminders', category: 'formula', content: '`>>` keeps the sign bit; `>>>` fills with zero; `~x = -x-1` for signed two’s-complement int.', importance: 'must_study' },
        { title: 'Object construction syntax', category: 'syntax', content: '`Type ref = new Type(args);` Constructor initializes the new object. `this.field` selects the current object’s field.', importance: 'important', code: 'Student s = new Student("Asha");\nSystem.out.println(s.name);', language: 'java' },
      ],
    },
    {
      topics: ['Overloading and overriding', 'Inheritance and constructors', 'Runtime polymorphism'],
      mustStudy: ['constructor invocation order', 'method overriding and dynamic dispatch', 'inheritance with super'],
      important: ['overloading', 'static/final and class members'], additional: ['inner classes'],
      evidence: 'The syllabus places inheritance, overriding, dynamic dispatch and constructor chaining together; these are standard long-answer and tracing outcomes in the supplied course pack. The extractable 2025 paper also tests constructor output.',
      addendum: "### Quick compare and trace\n| Feature | Overloading | Overriding |\n|---|---|---|\n| Parameters | Different list | Same compatible signature |\n| Chosen | Compile time | Runtime for instance methods |\n- A subclass constructor first invokes its superclass constructor (super(...)); then subclass initialization proceeds.\n- **Must Study:** constructor order, override rules, dynamic dispatch.\n- **Important:** overload resolution, static, final, super.\n- **Additional:** member/local inner classes.\n- Tier basis: sequence/dispatch questions require tracing; breadth tiers follow the module syllabus and supplied practice papers.",
      questions: [
        { topic: 'Overloading and overriding', question: 'Differentiate overloading and overriding in Java. State when each is resolved.', answer: 'Overloading uses one method name with different parameter lists and is selected at compile time. Overriding replaces an inherited instance method with a compatible signature and dispatches at runtime according to the actual object.', type: 'comparison', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Constructor chaining', question: 'In what order do constructors run when `new Child()` is executed for a class `Child extends Parent`?', answer: 'The parent constructor runs before the child constructor. If a child constructor explicitly calls `super(args)`, it must be its first statement. With no explicit call, Java inserts `super()` if an accessible no-argument parent constructor exists.', type: 'short_answer', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'Dynamic dispatch', question: 'What is dynamic method dispatch? Explain with a parent reference to a child object.', answer: 'For an overridden instance method, Java chooses the implementation at runtime using the object’s actual class, not the reference type. Thus `Parent p = new Child(); p.show();` calls `Child.show()` when it overrides `show()`.', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false },
        { topic: 'Inheritance', question: 'Write a short Java example that calls a superclass constructor and overrides a method.', answer: 'Use `super(name)` as the first child-constructor statement, then define the same compatible method signature in the child. The `@Override` annotation helps the compiler detect signature mistakes.', type: 'programming', marks: 5, difficulty: 'medium', importance: 'important', solved: false, code: 'class Parent { Parent(String s) {} void show() {} }\nclass Child extends Parent {\n  Child() { super("base"); }\n  @Override void show() { System.out.println("child"); }\n}', language: 'java' },
      ],
      revisions: [
        { title: 'Constructor call order', category: 'concept', content: 'Superclass construction precedes subclass construction. Explicit `super(args)` is first in a constructor.', importance: 'must_study' },
        { title: 'Overload vs override', category: 'comparison', content: 'Overload: same name, different parameters, compile-time selection. Override: compatible inherited signature, runtime dispatch.', importance: 'must_study' },
        { title: 'Dynamic dispatch trace', category: 'faq', content: 'For `Base x = new Derived(); x.f();`, an overridden instance `f` runs from `Derived`.', importance: 'important' },
      ],
    },
    {
      topics: ['Packages and access', 'Interfaces and abstract classes', 'Exception handling'],
      mustStudy: ['checked/unchecked exceptions and handling', 'interfaces versus abstract classes', 'throw/throws/finally'],
      important: ['packages and access protection', 'custom exceptions'], additional: ['Singleton and Adapter patterns'],
      evidence: 'The syllabus explicitly lists packages, interfaces, exceptions and patterns. The importance tier reflects examinable definitions, comparisons and short code traces in the supplied question bank/model set.',
      addendum: "### Exception pattern\n~~~java\ntry { risky(); }\ncatch (IOException e) { recover(); }\nfinally { cleanup(); }\n~~~\n- throw raises an exception; throws declares it. A checked exception must be caught or declared.\n| Interface | Abstract class |\n|---|---|\n| Contract/capabilities | Shared state and partial implementation |\n| A class may implement many | A class extends one class |\n- **Must Study:** checked vs unchecked, try/catch/finally, interface vs abstract class.\n- **Important:** packages/access and custom exceptions.\n- **Additional:** recognize Singleton/Adapter intent.\n- Tier basis: required syllabus points and supplied exam-practice material; tiers are not statistical predictions.",
      questions: [
        { topic: 'Java exceptions', question: 'Define checked and unchecked exceptions. Give one example of each.', answer: 'A checked exception is checked by the compiler and must be caught or declared, for example `IOException`. An unchecked exception is a `RuntimeException` (or its subclass), such as `NullPointerException`; Java does not require it to be caught or declared.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Interface and abstract class', question: 'Compare an interface with an abstract class in Java.', answer: 'An interface expresses a contract/capability and allows a class to implement multiple interfaces. An abstract class can keep instance state and shared implementation, but a class can extend only one class. Choose an interface for a common capability and an abstract class for shared base behavior/state.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'Exception control flow', question: 'Explain the roles of `try`, `catch`, `throw`, `throws` and `finally`.', answer: '`try` encloses risky code; `catch` handles a matching exception; `throw` raises an exception object; `throws` declares possible exceptions in a method signature; `finally` runs during normal or exceptional exit (except abnormal JVM termination).', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false },
        { topic: 'Custom exceptions', question: 'Write a method that rejects a negative age using a custom checked exception.', answer: 'Extend `Exception`, throw the custom type when the value is invalid, and declare it with `throws`.', type: 'programming', marks: 5, difficulty: 'medium', importance: 'important', solved: false, code: 'class InvalidAgeException extends Exception {\n  InvalidAgeException(String message) { super(message); }\n}\nstatic void validate(int age) throws InvalidAgeException {\n  if (age < 0) throw new InvalidAgeException("Negative age");\n}', language: 'java' },
      ],
      revisions: [
        { title: 'try / catch / finally', category: 'syntax', content: 'Put risky work in `try`; handle specific types in `catch`; cleanup in `finally` or try-with-resources.', importance: 'must_study' },
        { title: 'Interface vs abstract class', category: 'comparison', content: 'Interface = contract/multiple capabilities. Abstract class = shared state/implementation, single class inheritance.', importance: 'must_study' },
        { title: 'throw and throws', category: 'concept', content: '`throw e` raises one exception now. `throws E` declares a possible exception in a method signature.', importance: 'important' },
      ],
    },
    {
      topics: ['SOLID design', 'Swing and MVC', 'JDBC'],
      mustStudy: ['SOLID principles and design application', 'JDBC connection/query/result flow', 'PreparedStatement'],
      important: ['Swing events and MVC roles'], additional: ['AWT comparison and component details'],
      evidence: 'These are named syllabus outcomes for Module 4. The provided solved bank/model material is used as practice support; no frequency claim is made from image-only model-paper text.',
      addendum: "### JDBC exam sequence\n1. Obtain a Connection.\n2. Create a parameterized PreparedStatement; bind values with setX.\n3. Run executeQuery or executeUpdate; process a ResultSet.\n4. Close resources with try-with-resources.\n- **Must Study:** SOLID meaning/application, JDBC sequence, prepared query.\n- **Important:** MVC responsibilities and Swing event flow.\n- **Additional:** AWT/Swing component details.\n- Tier basis: explicit syllabus outcomes and supplied practice sources.",
      questions: [
        { topic: 'SOLID principles', question: 'Expand SOLID and state one short meaning for each principle.', answer: 'S: Single Responsibility—one reason to change. O: Open/Closed—extend without changing stable code. L: Liskov Substitution—subtypes preserve base behavior. I: Interface Segregation—prefer focused interfaces. D: Dependency Inversion—depend on abstractions.', type: 'short_answer', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'JDBC', question: 'List the basic JDBC steps to run a parameterized query and read its result.', answer: 'Get a connection; prepare SQL with placeholders; bind values; call `executeQuery`; read rows from `ResultSet`; close resources. Try-with-resources is the concise safe pattern.', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'PreparedStatement', question: 'Why is `PreparedStatement` safer than building SQL with string concatenation?', answer: 'It keeps SQL structure separate from values, binds values with typed setters, handles quoting and reduces SQL-injection risk. It can also reuse a compiled statement.', type: 'comparison', marks: 3, difficulty: 'easy', importance: 'must_study', solved: false },
        { topic: 'Swing and MVC', question: 'Draw or describe MVC for a small Swing application. Where does a button listener fit?', answer: 'Model stores application data/rules; View displays Swing components; Controller handles user actions and coordinates updates. A button listener performs controller/event-handling work and asks the model to update, then refreshes the view.', type: 'diagram', marks: 5, difficulty: 'medium', importance: 'important', solved: false, detail: 'Exam sketch: User → View (button) → Controller/listener → Model → updated View.' },
      ],
      revisions: [
        { title: 'SOLID mnemonic', category: 'concept', content: 'SRP one responsibility; OCP safe extension; LSP valid substitution; ISP focused interfaces; DIP abstractions.', importance: 'must_study' },
        { title: 'JDBC sequence', category: 'syntax', content: 'Connection → PreparedStatement → bind → execute → ResultSet → close. Prefer try-with-resources.', importance: 'must_study', code: 'String sql = "SELECT name FROM student WHERE id = ?";\ntry (PreparedStatement ps = connection.prepareStatement(sql)) {\n  ps.setInt(1, studentId);\n  try (ResultSet rs = ps.executeQuery()) {\n    if (rs.next()) System.out.println(rs.getString("name"));\n  }\n}', language: 'java', diagramKey: 'jdbc-architecture' },
        { title: 'MVC roles', category: 'diagram', content: 'User → View → Controller → Model → View refresh. Keep display, event handling and domain data separate.', importance: 'important', diagramKey: 'swing-mvc' },
      ],
    },
  ],
  PCCST302: [
    {
      topics: ['Alphabet, strings and languages', 'DFA and NFA', 'DFA design'],
      mustStudy: ['formal definitions and language notation', 'DFA/NFA transition tracing', 'subset construction'],
      important: ['epsilon closure and state minimization'], additional: ['finite automata applications'],
      evidence: 'The November 2025 PYQ asks for alphabet/string/language definitions and DFA construction for a pattern condition. These directly support the top tier.',
      addendum: "### Automata checklist\n- Σ* includes ε; a language is any subset of Σ*.\n- DFA transition function: δ: Q × Σ → Q. NFA may have multiple next states; accept if at least one path ends in a final state.\n- Pattern “AB occurs” needs states for no useful suffix, seen A, and seen AB (accepting); keep the longest suffix that is a prefix of AB.\n- **Must Study:** definitions, transition tables, DFA/NFA design/subset construction.\n- **Important:** epsilon closure/minimization.\n- **Additional:** applications.\n- Basis: exact 2025 definitions/design prompt plus explicit syllabus coverage; no unsupported frequency count.",
      questions: [
        { topic: 'Formal language definitions', source: 'KTU November 2025 PYQ — adapted definitions question', question: 'Define alphabet, string and language with one example of each.', answer: 'An alphabet `Σ` is a finite nonempty symbol set, e.g. `{0,1}`. A string is a finite sequence from `Σ`, e.g. `101`; `ε` is the empty string. A language is a set of strings over the alphabet, e.g. strings ending in `1`.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'DFA and NFA', question: 'Compare a DFA and an NFA in their transition rules and acceptance.', answer: 'A DFA has exactly one next state for every state/symbol pair. An NFA may have zero, one or several next states and can have ε-moves. Both accept exactly the regular languages; an NFA accepts if at least one computation path reaches a final state.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'Subset construction', question: 'How is an NFA converted to an equivalent DFA?', answer: 'Use subsets of NFA states as DFA states. Start with the ε-closure of the NFA start state. On each symbol, union all reachable NFA states and take ε-closure. A subset is accepting when it contains an NFA final state.', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false },
        { topic: 'DFA design', source: 'KTU November 2025 PYQ — adapted substring DFA question', diagramKey: 'dfa-substring', question: 'Design a DFA over `{A,B,C}` that accepts strings containing the consecutive substring `AB`.', answer: 'Use `q0` (no suffix A), `q1` (last symbol A), and accepting `q2` (AB has occurred). Transitions: from q0, A→q1 and B/C→q0; from q1, A→q1, B→q2, C→q0; from q2, every symbol→q2.', type: 'diagram', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false, detail: 'Write the three states and label each arrow; double-circle q2.' },
      ],
      revisions: [
        { title: 'Language notation', category: 'definition', content: '`Σ` finite alphabet; `ε` empty string; `Σ*` all finite strings including ε; language `L ⊆ Σ*`.', importance: 'must_study', diagramKey: 'dfa-substring' },
        { title: 'DFA / NFA acceptance', category: 'comparison', content: 'DFA: one move per symbol. NFA: set of possible moves. Both accept iff a valid computation ends in a final state.', importance: 'must_study' },
        { title: 'Subset construction', category: 'concept', content: 'DFA states are NFA-state subsets; start at ε-closure; transition then ε-close; accepting subset contains an NFA final state.', importance: 'must_study' },
      ],
    },
    {
      topics: ['Regular expressions', 'Regular languages and pumping lemma', 'Context-free grammars'],
      mustStudy: ['regex ↔ finite automata ideas', 'regular versus non-regular language reasoning', 'CFG derivations and ambiguity'],
      important: ['closure/decision properties'], additional: ['proof details of pumping lemma'],
      evidence: 'The November 2025 PYQ challenges the claim that `(ab)*` generates `{aⁿbⁿ}`; this directly tests regex limits. The syllabus includes CFG derivation and ambiguity.',
      addendum: "### Regex and grammar cues\n- (a|b)* means any finite string over {a,b}; (ab)* repeats the whole block ab.\n- (ab)* does **not** generate {aⁿbⁿ | n≥1}: it generates alternating ab blocks.\n- A CFG production replaces one nonterminal. A grammar is ambiguous if one string has two distinct parse trees (or leftmost derivations).\n- **Must Study:** regex meaning, automata conversion, CFG derivation/ambiguity.\n- **Important:** closure and decision properties.\n- **Additional:** pumping-lemma proof mechanics.\n- Basis: direct 2025 regex counterexample prompt plus syllabus topics.",
      questions: [
        { topic: 'Regular expressions', source: 'KTU November 2025 PYQ — adapted regex claim question', question: 'Does `(ab)*` generate every string in `{aⁿbⁿ | n ≥ 1}`? Explain with a counterexample.', answer: 'No. `(ab)*` generates ε, ab, abab, … with alternating symbols. For n=2 the target string is `aabb`, which is not in `(ab)*`. This balanced language is not regular.', type: 'problem_solving', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'Regular expression operators', question: 'Explain union, concatenation and Kleene star with a simple example.', answer: 'Union `a|b` chooses either symbol; concatenation `ab` places `a` then `b`; star `a*` repeats `a` zero or more times, so it includes ε.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'CFG ambiguity', question: 'What does it mean for a context-free grammar to be ambiguous?', answer: 'A CFG is ambiguous if at least one generated string has more than one distinct parse tree; equivalently it has more than one leftmost derivation (and more than one rightmost derivation).', type: 'definition', marks: 3, difficulty: 'medium', importance: 'important', solved: false },
        { topic: 'CFG derivation', question: 'For `S → aSb | ε`, derive the string `aabb` and state the language pattern.', answer: '`S ⇒ aSb ⇒ aaSbb ⇒ aaεbb = aabb`. In general it generates `{aⁿbⁿ | n≥0}`.', type: 'problem_solving', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false },
      ],
      revisions: [
        { title: 'Regular expression operators', category: 'syntax', content: 'Union `|`; concatenation joins; `*` means zero or more repetitions and includes ε.', importance: 'must_study' },
        { title: 'Regex limit check', category: 'faq', content: '`(ab)*` is alternating blocks; it cannot generate `aabb`. Equal-count `aⁿbⁿ` needs memory and is not regular.', importance: 'must_study' },
        { title: 'CFG ambiguity', category: 'definition', content: 'Ambiguous if some generated string has two different parse trees / leftmost derivations.', importance: 'important' },
      ],
    },
    {
      topics: ['Pushdown automata', 'CFG and PDA equivalence', 'Normal forms'],
      mustStudy: ['PDA stack behavior', 'CFG–PDA relationship', 'CFG simplification and normal forms'],
      important: ['deterministic and nondeterministic PDA'], additional: ['formal closure/property proofs'],
      evidence: 'The syllabus explicitly requires PDA constructions, grammar equivalence, simplification, CNF/GNF and pumping properties; these support question-style priorities rather than frequency claims.',
      addendum: "### PDA and normal-form cues\n- A PDA adds a stack to finite control. The stack gives unbounded last-in/first-out memory.\n- For {aⁿbⁿ}: push one marker for each a, then pop one for each b; reject mismatched order/count.\n- CNF productions are A→BC or A→a (plus optional start-to-ε case). GNF has A→aα.\n- **Must Study:** stack trace, CFG/PDA equivalence idea, CNF/GNF forms.\n- **Important:** DPDA/NPDA distinction and simplification steps.\n- **Additional:** property proof details.\n- Basis: explicit listed syllabus outcomes and supplied practice set.",
      questions: [
        { topic: 'Pushdown automata', question: 'What extra memory does a PDA have, and how can it recognize `{aⁿbⁿ | n≥0}`?', answer: 'A PDA has a stack. Push one marker for each leading `a`; when `b`s begin, pop one marker per `b`; accept when the input ends with the stack back at its bottom marker. This enforces equal counts and order.', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'CFG and PDA', question: 'State the relationship between context-free languages and pushdown automata.', answer: 'A language is context-free exactly when some nondeterministic PDA recognizes it. Grammars generate the strings; an NPDA can simulate derivation/stack expansion, and a CFG can be built from PDA computations.', type: 'short_answer', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'CNF and GNF', question: 'Compare Chomsky Normal Form (CNF) and Greibach Normal Form (GNF).', answer: 'In CNF, productions are `A→BC` or `A→a` (with a special start ε rule when needed). In GNF, each production begins with a terminal: `A→aα`, where α is a sequence of nonterminals.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false },
        { topic: 'PDA trace', question: 'A PDA pushes X for each `a` and pops X for each `b`. What happens on input `aab`? Is it accepted by an empty-stack rule?', answer: 'After `aa`, the stack has two X markers. The final `b` removes one, leaving one X. Input ends with a nonempty stack, so it is not accepted by the stated empty-stack condition.', type: 'problem_solving', marks: 3, difficulty: 'easy', importance: 'important', solved: false },
      ],
      revisions: [
        { title: 'PDA memory', category: 'concept', content: 'Finite control + LIFO stack. Push for each `a`, pop for each matching `b` to check equal ordered counts.', importance: 'must_study' },
        { title: 'CFG normal forms', category: 'definition', content: 'CNF: `A→BC` or `A→a` (special ε exception). GNF: `A→aα`.', importance: 'must_study' },
        { title: 'CFG ↔ NPDA', category: 'faq', content: 'A language is context-free iff it is accepted by some nondeterministic PDA.', importance: 'important' },
      ],
    },
    {
      topics: ['Turing machines', 'Decidability', 'Reductions and halting'],
      mustStudy: ['TM configurations and language recognition', 'decider versus recognizer', 'halting problem and reductions'],
      important: ['computability limits'], additional: ['formal reduction proof detail'],
      evidence: 'These are the central Module 4 syllabus outcomes. No extractable Module 4 question text was available in the supplied 2025 PYQ, so no frequency claim is made.',
      addendum: "### Computability in three lines\n- A TM has finite control, an unbounded tape and a read/write head; one step reads, writes, changes state and moves.\n- A **decider** halts on every input. A **recognizer** accepts members but may loop on nonmembers.\n- The halting problem is undecidable. A reduction maps instances of a known hard problem to a new one while preserving yes/no answers.\n- **Must Study:** TM operation, decider/recognizer, halting result.\n- **Important:** reductions and recognizable/decidable languages.\n- **Additional:** proof construction detail.\n- Basis: module syllabus; use as structural priority, not paper-frequency evidence.",
      questions: [
        { topic: 'Turing machine', question: 'Define a Turing machine and name its main parts.', answer: 'A Turing machine is an abstract computation model with a finite control, an unbounded tape divided into cells, a tape alphabet, a read/write head, a transition function, a start state and halting/accepting states.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Decider and recognizer', question: 'Compare a decider with a recognizer.', answer: 'A decider halts on every input and accepts exactly the language members. A recognizer accepts every member but may reject or run forever on a nonmember.', type: 'comparison', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'Halting problem', question: 'State the halting problem and its decidability result.', answer: 'Given a program/TM M and input w, determine whether M eventually halts on w. No algorithm solves this correctly for every pair (M,w); the problem is undecidable.', type: 'short_answer', marks: 3, difficulty: 'medium', importance: 'must_study', solved: false },
        { topic: 'Many-one reductions', question: 'What does a computable many-one reduction from A to B show?', answer: 'It is a computable map f such that `x∈A` iff `f(x)∈B`. If A is undecidable and A reduces to B, then B cannot be decidable; otherwise a decider for B would decide A.', type: 'problem_solving', marks: 5, difficulty: 'hard', importance: 'important', solved: false },
      ],
      revisions: [
        { title: 'Decider vs recognizer', category: 'comparison', content: 'Decider always halts. Recognizer must accept members but may loop on nonmembers.', importance: 'must_study' },
        { title: 'Halting problem', category: 'faq', content: 'Input: machine M and word w. Question: does M halt on w? It is undecidable in general.', importance: 'must_study' },
        { title: 'Reduction direction', category: 'concept', content: 'If hard A reduces to B, a solver for B would solve A. Thus undecidable A ⇒ undecidable B.', importance: 'important' },
      ],
    },
  ],
  GAMAT301: [
    {
      topics: ['Discrete random variables', 'PMF/CDF', 'Expectation and variance'],
      mustStudy: ['normalize a PMF and compute probabilities', 'expectation and variance', 'Binomial/Poisson basics'],
      important: ['joint/marginal distributions and independence'], additional: ['proofs of moment identities'],
      evidence: 'The November 2025 PYQ asks to normalize a discrete distribution and find an even-value probability; the supplied paper also tests distribution concepts. This is direct Module 1 evidence.',
      addendum: "### Essential formulas\n- PMF: p(x)≥0, Σp(x)=1; CDF: F(x)=P(X≤x).\n- E[X]=Σxp(x); Var(X)=E[X²]−(E[X])².\n- Binomial: P(X=k)=C(n,k)p^k(1−p)^(n−k), mean np, variance np(1−p).\n- Poisson: P(X=k)=e^(−λ)λ^k/k!, mean and variance λ.\n- **Must Study:** normalization, event probability, mean/variance, Binomial/Poisson.\n- **Important:** joint/marginal/independence.\n- **Additional:** moment proofs.\n- Evidence: direct 2025 PMF normalization question; remaining levels follow syllabus coverage.",
      questions: [
        { topic: 'PMF normalization', source: 'KTU November 2025 PYQ — adapted PMF normalization and event probability', question: 'A discrete random variable has `P(X=x)=k(x+1)` for x=0,1,2. Find k and P(X is even).', answer: 'Normalize: `k(1+2+3)=1`, so `k=1/6`. Even x are 0 and 2: `P= k(1+3)=4/6=2/3`.', type: 'numerical', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`Σx p(x)=1`; `P(X even)=p(0)+p(2)`' },
        { topic: 'Expectation and variance', question: 'State the formulas for the expectation and variance of a discrete random variable.', answer: '`E[X]=Σ_x x p(x)`. Also `E[X²]=Σ_x x²p(x)` and `Var(X)=E[X²]−(E[X])²`.', type: 'short_answer', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, formula: '`Var(X)=E[X²]−μ²`' },
        { topic: 'Binomial and Poisson', question: 'Compare the Binomial and Poisson models and state when Poisson approximates Binomial.', answer: 'Binomial counts successes in fixed n independent trials with success chance p. Poisson counts events with rate λ. Poisson approximates Binomial when n is large, p is small, and λ=np is kept moderate.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'important', solved: false },
        { topic: 'Poisson probability', question: 'If X is Poisson with λ=2, find P(X=0) and P(X=1).', answer: '`P(0)=e⁻²≈0.1353`. `P(1)=2e⁻²≈0.2707`.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'must_study', solved: false, formula: '`P(X=k)=e^(−λ) λ^k/k!`' },
      ],
      revisions: [
        { title: 'PMF and CDF', category: 'definition', content: 'PMF `p(x)=P(X=x)`; nonnegative and sums to 1. CDF `F(x)=P(X≤x)`.', importance: 'must_study' },
        { title: 'Mean and variance', category: 'formula', content: '`E[X]=Σxp(x)`; `Var(X)=Σx²p(x)−(E[X])²`.', importance: 'must_study' },
        { title: 'Binomial / Poisson', category: 'formula', content: 'Binomial: `C(n,k)p^k(1-p)^(n-k)`, mean `np`. Poisson: `e^-λ λ^k/k!`, mean/variance `λ`.', importance: 'must_study' },
      ],
    },
    {
      topics: ['Continuous random variables', 'PDF and CDF', 'Uniform, normal and exponential laws'],
      mustStudy: ['PDF integration and CDF construction', 'Uniform/Normal/Exponential distributions', 'expectation and probability intervals'],
      important: ['joint continuous distributions'], additional: ['distribution transformation details'],
      evidence: 'The November 2025 PYQ includes a piecewise continuous CDF/PDF exercise and distribution classification. That directly supports integration and distribution-law practice.',
      addendum: "### Continuous variable checklist\n- PDF f(x)≥0 and ∫f(x)dx=1. CDF F(x)=∫₋∞ˣ f(t)dt; probability over an interval is an integral.\n- Uniform [a,b]: mean (a+b)/2, variance (b−a)²/12.\n- Exponential rate λ: f(x)=λe^(−λx) for x≥0; mean 1/λ.\n- Standard normal: Z=(X−μ)/σ.\n- **Must Study:** integrate PDF/CDF and identify laws.\n- **Important:** expectation, variance, joint/marginal laws.\n- **Additional:** advanced transformations.\n- Evidence: direct 2025 continuous-distribution question.",
      questions: [
        { topic: 'PDF normalization', source: 'KTU November 2025 PYQ — adapted continuous CDF/PDF problem', question: 'Let f(x)=c x on 0<x<2 and 0 otherwise. Find c and P(X<1).', answer: 'Normalize: `∫₀² cx dx=2c=1`, so `c=1/2`. Then `P(X<1)=∫₀¹ x/2 dx=1/4`.', type: 'numerical', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`P(a<X≤b)=∫ₐᵇ f(x) dx`' },
        { topic: 'PDF and CDF', question: 'Define a probability density function and explain how its CDF is obtained.', answer: 'A PDF is a nonnegative function with total integral 1 whose integrals give probabilities. Its CDF is `F(x)=P(X≤x)=∫_{−∞}^{x} f(t)dt`.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Continuous distributions', question: 'Compare Uniform and Exponential distributions by support and shape/use.', answer: 'Uniform on `[a,b]` gives constant density across a finite interval. Exponential on `[0,∞)` has decreasing density `λe^(−λx)` and models waiting time between events in a Poisson process.', type: 'comparison', marks: 3, difficulty: 'medium', importance: 'important', solved: false },
        { topic: 'Standardization', question: 'A normal variable has mean 10 and standard deviation 2. Convert X=14 to a standard normal score.', answer: '`z=(x−μ)/σ=(14−10)/2=2`.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'must_study', solved: false, formula: '`Z=(X−μ)/σ`' },
      ],
      revisions: [
        { title: 'PDF / CDF', category: 'formula', content: '`f≥0`, `∫f=1`; `F(x)=∫₋∞ˣ f(t)dt`; `P(a<X≤b)=F(b)−F(a)`.', importance: 'must_study' },
        { title: 'Common continuous distributions', category: 'comparison', content: 'Uniform: constant density on `[a,b]`. Exponential: `λe^-λx` on x≥0. Normal: bell curve; standardize using z-score.', importance: 'must_study' },
        { title: 'Normal z-score', category: 'formula', content: '`z=(x−μ)/σ`; table values are commonly for standard normal Z.', importance: 'important' },
      ],
    },
    {
      topics: ['Inequalities and limit laws', 'Stochastic processes', 'Poisson process'],
      mustStudy: ['Chebyshev inequality', 'LLN and CLT conditions/meaning', 'Poisson-process count and waiting-time formulas'],
      important: ['process and interarrival definitions'], additional: ['proof derivations'],
      evidence: 'The supplied syllabus explicitly covers inequalities, convergence laws and Poisson processes; practice priorities emphasize calculations and interpretation rather than unverified past-paper frequency.',
      addendum: "### Limit and process formulas\n- Chebyshev: P(|X−μ|≥a)≤σ²/a².\n- CLT: for large n, (Sₙ−nμ)/(σ√n) is approximately standard normal under the usual independent, identical finite-variance assumptions.\n- Poisson process rate λ: N(t)~Poisson(λt), so P(N(t)=k)=e^(−λt)(λt)^k/k!; waiting time is exponential with mean 1/λ.\n- **Must Study:** choose/apply Chebyshev, interpret LLN/CLT, Poisson count.\n- **Important:** interarrival/waiting-time properties.\n- **Additional:** proof steps.\n- Basis: explicit module outcomes.",
      questions: [
        { topic: 'Chebyshev inequality', question: 'A random variable has μ=20 and σ=3. Use Chebyshev to bound P(|X−20|≥6).', answer: '`P(|X−μ|≥6)≤σ²/6²=9/36=1/4`.', type: 'numerical', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`P(|X−μ|≥a) ≤ σ²/a²`' },
        { topic: 'Central limit theorem', question: 'State the Central Limit Theorem in exam-friendly form.', answer: 'For a sufficiently large sample of independent, identically distributed variables with finite mean μ and variance σ², the standardized sample sum/mean is approximately normal, even when the original distribution is not normal.', type: 'short_answer', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'Poisson process', question: 'For a Poisson process with rate 3 per hour, find the probability of exactly two events in one hour.', answer: '`N(1)~Poisson(3)`. Thus `P(N=2)=e⁻³ 3²/2! = 4.5e⁻³ ≈ 0.2240`.', type: 'numerical', marks: 3, difficulty: 'medium', importance: 'must_study', solved: false, formula: '`N(t)~Poisson(λt)`' },
        { topic: 'LLN and CLT', question: 'Compare the Law of Large Numbers and the Central Limit Theorem.', answer: 'LLN says the sample mean approaches the population mean as sample size grows. CLT describes the approximate distribution of the standardized sum/mean for large samples.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'important', solved: false },
      ],
      revisions: [
        { title: 'Inequality bounds', category: 'formula', content: 'Chebyshev: `P(|X−μ|≥a)≤σ²/a²` for finite variance.', importance: 'must_study' },
        { title: 'Poisson process', category: 'formula', content: '`N(t)~Poisson(λt)`; interarrival time is Exponential(rate λ), mean `1/λ`.', importance: 'must_study' },
        { title: 'LLN vs CLT', category: 'comparison', content: 'LLN: sample average settles near μ. CLT: standardized average has an approximately normal shape for large n.', importance: 'important' },
      ],
    },
    {
      topics: ['Markov chains', 'Transition matrices', 'Stationary distributions'],
      mustStudy: ['transition matrix powers and multi-step probabilities', 'state classification/irreducibility', 'stationary distribution equations'],
      important: ['Chapman–Kolmogorov and random walks'], additional: ['long proofs of convergence'],
      evidence: 'These are the named Module 4 syllabus outcomes; tiers prioritize matrix calculations and state reasoning, not a claimed frequency count from image-only model-paper text.',
      addendum: "### Markov-chain method\n- A transition matrix P has nonnegative entries and every row sums to 1 (row-vector convention).\n- n-step transitions: Pⁿ; Chapman–Kolmogorov: p⁽ⁿ⁺ᵐ⁾ᵢⱼ=Σₖp⁽ⁿ⁾ᵢₖp⁽ᵐ⁾ₖⱼ.\n- Stationary row distribution: πP=π and Σπᵢ=1.\n- **Must Study:** matrix powers, classify states, solve π equations.\n- **Important:** random walks and Chapman–Kolmogorov.\n- **Additional:** convergence proofs.\n- Basis: explicit syllabus learning outcomes.",
      questions: [
        { topic: 'Transition matrix', question: 'For P=[[0.7,0.3],[0.2,0.8]], find the probability of moving from state 1 to state 2 in two steps.', answer: '`(P²)₁₂=0.7·0.3+0.3·0.8=0.21+0.24=0.45`.', type: 'numerical', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`(P²)ᵢⱼ=Σₖpᵢₖpₖⱼ`' },
        { topic: 'Markov property', question: 'Define a Markov chain and its Markov property.', answer: 'A Markov chain is a stochastic process on states where the next-state distribution depends on the current state, not the full past: `P(Xₙ₊₁=j | Xₙ=i, past)=P(Xₙ₊₁=j | Xₙ=i)`.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Stationary distribution', question: 'Find the stationary distribution for P=[[0.7,0.3],[0.2,0.8]].', answer: 'Let π=(a,b), `a+b=1`. From `πP=π`, `0.3a=0.2b`, hence `b=1.5a`; so `a=0.4`, `b=0.6`.', type: 'problem_solving', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false, formula: '`πP=π`, `Σπᵢ=1`' },
        { topic: 'Stationary distribution', question: 'What is a stationary distribution? State the equations used to find it.', answer: 'A probability row vector π unchanged by one transition. Solve `πP=π` together with `Σᵢπᵢ=1` and `πᵢ≥0`.', type: 'short_answer', marks: 3, difficulty: 'easy', importance: 'must_study', solved: false },
      ],
      revisions: [
        { title: 'Transition matrix powers', category: 'formula', content: 'With row probabilities, n-step transitions are `Pⁿ`. Each row of P sums to 1.', importance: 'must_study' },
        { title: 'Stationary distribution', category: 'formula', content: 'Solve `πP=π`, `Σπᵢ=1`, `πᵢ≥0`.', importance: 'must_study', diagramKey: 'markov-states' },
        { title: 'Chapman–Kolmogorov', category: 'formula', content: '`p⁽ⁿ⁺ᵐ⁾ᵢⱼ=Σₖp⁽ⁿ⁾ᵢₖp⁽ᵐ⁾ₖⱼ`: sum over possible intermediate states.', importance: 'important' },
      ],
    },
  ],
  PCCST303: [
    {
      topics: ['Complexity and asymptotic notation', 'Arrays and sparse matrices', 'Stacks and queues'],
      mustStudy: ['time-complexity analysis', 'stack operations and overflow/underflow', 'queue/array representations'],
      important: ['sparse matrices and expression conversion'], additional: ['implementation variants'],
      evidence: 'The November 2025 PYQ asks loop time complexity and array-stack push/pop algorithms. These are direct Module 1 evidence.',
      addendum: "### Complexity and stack formulas\n- One loop of n iterations: O(n); repeatedly halve n: O(log n); nested independent n loops: O(n²).\n- Stack is LIFO: push adds at top; pop removes top. Check top == capacity−1 before push and top == −1 before pop.\n- Queue is FIFO; circular queue next index: (i+1) mod capacity.\n- **Must Study:** complexity tracing and stack algorithms.\n- **Important:** queue, infix/postfix, sparse matrix.\n- **Additional:** alternative representations.\n- Evidence: direct 2025 complexity and stack prompts.",
      questions: [
        { topic: 'Asymptotic analysis', source: 'KTU November 2025 PYQ — adapted halving-loop complexity', question: 'Find the time complexity of `for(i=n; i>0; i=i/2) print(i);`.', answer: 'Each iteration halves i. It runs about `log₂ n` times, so time is `Θ(log n)`.', type: 'numerical', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`T(n)=T(n/2)+Θ(1)=Θ(log n)`' },
        { topic: 'Stack operations', source: 'KTU November 2025 PYQ — adapted array stack operations', question: 'Write array-based PUSH and POP algorithms and state overflow/underflow conditions.', answer: 'PUSH: if `top==N−1`, overflow; otherwise increment top and store item. POP: if `top==−1`, underflow; otherwise save `A[top]`, decrement top and return saved value.', type: 'programming', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, code: 'PUSH(A, item):\n  if top == N-1: report OVERFLOW\n  else: top = top + 1; A[top] = item\nPOP(A):\n  if top == -1: report UNDERFLOW\n  else: item = A[top]; top = top - 1; return item', language: 'text' },
        { topic: 'Stack and queue', question: 'Compare a stack and a queue by removal order and common operations.', answer: 'Stack is LIFO with `push`/`pop` at one end. Queue is FIFO with insertion at rear (`enqueue`) and removal at front (`dequeue`).', type: 'comparison', marks: 3, difficulty: 'easy', importance: 'important', solved: false },
        { topic: 'Postfix evaluation', question: 'Evaluate postfix expression `5 2 3 * +` using a stack.', answer: 'Push 5, 2, 3. `*` pops 3 and 2, pushes 6. `+` pops 6 and 5, pushes 11. Result is 11.', type: 'problem_solving', marks: 3, difficulty: 'medium', importance: 'must_study', solved: false },
      ],
      revisions: [
        { title: 'Asymptotic quick guide', category: 'concept', content: 'Halving/doubling loop → `Θ(log n)`; single pass → `Θ(n)`; two nested n loops → `Θ(n²)`.', importance: 'must_study' },
        { title: 'Stack operations', category: 'program', content: 'Push: test full, increment top, store. Pop: test empty, read top, decrement. LIFO.', importance: 'must_study', code: 'int[] stack = new int[N]; int top = -1;\nif (top == N - 1) throw new RuntimeException("overflow");\nstack[++top] = x;\nif (top == -1) throw new RuntimeException("underflow");\nint item = stack[top--];', language: 'java' },
        { title: 'Stack vs queue', category: 'comparison', content: 'Stack LIFO (`push/pop`). Queue FIFO (`enqueue/dequeue`).', importance: 'important' },
      ],
    },
    {
      topics: ['Linked lists', 'Polynomial representation', 'Memory allocation'],
      mustStudy: ['self-referential node and pointer links', 'linked-list insertion/deletion traversal', 'first/best/worst-fit allocation'],
      important: ['polynomial linked lists'], additional: ['garbage collection/compaction details'],
      evidence: 'The November 2025 PYQ asks what a self-referential structure is. The syllabus includes linked lists and first/best/worst-fit allocation.',
      addendum: "### Node and allocation cues\n~~~c\nstruct Node { int data; struct Node *next; };\n~~~\n- A self-referential structure contains a pointer to its own structure type; the pointer links nodes.\n- First-fit picks the first free block large enough; best-fit picks the smallest fitting block; worst-fit picks the largest fitting block.\n- **Must Study:** node links, insert/delete steps, allocation strategies.\n- **Important:** polynomial list representation.\n- **Additional:** garbage collection and compaction distinctions.\n- Evidence: direct 2025 self-reference question plus listed syllabus.",
      questions: [
        { topic: 'Self-referential structures', source: 'KTU November 2025 PYQ — adapted self-referential structure question', question: 'What is a self-referential structure in C? Give a node example.', answer: 'A structure with a pointer member that can point to another object of the same structure type. Example: `struct Node { int data; struct Node *next; };`.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, code: 'struct Node { int data; struct Node *next; };', language: 'c' },
        { topic: 'Linked-list insertion', question: 'How do you insert a node at the beginning of a singly linked list?', answer: 'Allocate node p; set `p->data`; set `p->next=head`; then set `head=p`. Updating the link before replacing head preserves the old list.', type: 'programming', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, code: 'p->data = x;\np->next = head;\nhead = p;', language: 'c' },
        { topic: 'Allocation strategies', question: 'Compare first-fit, best-fit and worst-fit memory allocation.', answer: 'First-fit chooses the first adequate free block; best-fit chooses the smallest adequate block; worst-fit chooses the largest free block. Each can fragment memory differently; no strategy eliminates fragmentation.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false },
        { topic: 'Linked-list traversal', question: 'A list contains 4→7→9→NULL. What value is at the third node, and how many links are followed from head?', answer: 'The third node stores 9. Starting at head, follow two `next` links to reach it.', type: 'problem_solving', marks: 3, difficulty: 'easy', importance: 'important', solved: false },
      ],
      revisions: [
        { title: 'Linked-list insertion', category: 'syntax', content: 'Beginning insert: `new->next=head; head=new`. Node has data and a same-type pointer.', importance: 'must_study' },
        { title: 'Allocation strategies', category: 'comparison', content: 'First-fit: first adequate. Best-fit: smallest adequate. Worst-fit: largest available.', importance: 'must_study' },
        { title: 'Polynomial list', category: 'concept', content: 'Store each nonzero term as coefficient + exponent + next pointer; combine terms with equal exponents.', importance: 'important' },
      ],
    },
    {
      topics: ['Trees and binary search trees', 'Heaps and priority queues', 'Graphs and traversal'],
      mustStudy: ['tree traversal orders and BST search', 'heap/priority queue operations', 'BFS/DFS and graph representation'],
      important: ['expression trees and shortest-path applications'], additional: ['implementation details of variants'],
      evidence: 'The 2025 question paper includes expression-tree construction in the long-answer portion; the syllabus lists trees, heaps, graphs, BFS/DFS and applications.',
      addendum: "### Traversal and graph patterns\n- Preorder Root-Left-Right; inorder Left-Root-Right; postorder Left-Right-Root.\n- BST: left keys < node < right keys (assuming distinct keys); search follows one root-to-leaf path.\n- BFS uses a queue; DFS uses recursion or a stack. With adjacency lists both take O(V+E).\n- **Must Study:** traversals, BST, heaps, BFS/DFS.\n- **Important:** expression trees/shortest-path use.\n- **Additional:** alternate implementations.\n- Evidence: 2025 expression-tree question and syllabus.",
      questions: [
        { topic: 'Tree traversals', question: 'For a root A with left child B and right child C, give preorder, inorder and postorder.', answer: 'Preorder: A,B,C. Inorder: B,A,C. Postorder: B,C,A.', type: 'problem_solving', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Expression tree', source: 'KTU November 2025 PYQ — adapted expression tree question', diagramKey: 'expression-tree', question: 'Draw the expression tree for `(a+b)*c` and give its postorder traversal.', answer: 'Root `*`; left child `+` with leaves a,b; right child c. Postorder is `a b + c *`.', type: 'diagram', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true, detail: 'Sketch: `*` with left `+ (a,b)` and right `c`.' },
        { topic: 'BFS and DFS', question: 'Compare BFS and DFS data structures and a common use.', answer: 'BFS explores level by level using a queue and finds shortest paths in an unweighted graph. DFS follows a branch using recursion/stack and is useful for reachability, cycle and component checks.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false },
        { topic: 'Binary search tree', question: 'Insert 8, 4, 12, 2 into an empty BST. What is the path to search for 2?', answer: 'Tree root is 8; 4 is its left child; 12 its right; 2 is left child of 4. Search path: 8 → 4 → 2.', type: 'problem_solving', marks: 3, difficulty: 'easy', importance: 'important', solved: false },
      ],
      revisions: [
        { title: 'Tree traversals', category: 'syntax', content: 'Pre: Root-L-R. In: L-Root-R. Post: L-R-Root. Inorder of a BST is sorted.', importance: 'must_study' },
        { title: 'BFS / DFS', category: 'comparison', content: 'BFS = queue, level order, unweighted shortest path. DFS = stack/recursion, deep exploration.', importance: 'must_study' },
        { title: 'Heap cue', category: 'concept', content: 'Binary heap is a complete tree; min-heap parent ≤ children, max-heap parent ≥ children.', importance: 'important' },
      ],
    },
    {
      topics: ['Sorting algorithms', 'Searching', 'Hashing and collisions'],
      mustStudy: ['insertion/quick/merge/heap sorting and complexity', 'binary search precondition', 'hash collision resolution'],
      important: ['stable versus in-place behavior'], additional: ['radix-sort implementation details'],
      evidence: 'The November 2025 PYQ explicitly asks for insertion-sort algorithm; supplied syllabus covers sorting, search and hashing.',
      addendum: "### Sorting and hashing table\n| Method | Typical time | Stable? |\n|---|---:|---|\n| Insertion | O(n²); best O(n) | Yes |\n| Merge | O(n log n) | Yes |\n| Quick | average O(n log n), worst O(n²) | Usually no |\n- Binary search requires sorted data and halves the search range (O(log n)).\n- Collision methods: chaining; linear/quadratic probing; double hashing.\n- **Must Study:** insertion sort, comparison sorting complexity, binary search, collision handling.\n- **Important:** stability/in-place comparisons.\n- **Additional:** radix details.\n- Evidence: direct 2025 insertion-sort question.",
      questions: [
        { topic: 'Insertion sort', source: 'KTU November 2025 PYQ — adapted insertion sort problem', question: 'Sort `[5, 2, 4, 1]` using insertion sort and show the passes.', answer: 'Pass 1: `[2,5,4,1]`; pass 2: `[2,4,5,1]`; pass 3: `[1,2,4,5]`. Each pass inserts the next key into the sorted prefix.', type: 'problem_solving', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'Insertion sort', question: 'Write insertion sort pseudocode and state its best and worst time complexity.', answer: 'For each i from 1 to n−1, save key=A[i], shift larger prior elements right, then place key. Best case is Θ(n) on sorted input; average/worst is Θ(n²).', type: 'programming', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true, code: 'for i = 1 to n-1:\n  key = A[i]; j = i-1\n  while j >= 0 and A[j] > key:\n    A[j+1] = A[j]; j = j-1\n  A[j+1] = key', language: 'text' },
        { topic: 'Binary search', question: 'Why must binary search use sorted data? State its time complexity.', answer: 'After comparing the middle element, the algorithm discards one half. This is valid only when sorted order proves the target cannot be in that half. Time is Θ(log n).', type: 'short_answer', marks: 3, difficulty: 'easy', importance: 'must_study', solved: false },
        { topic: 'Hashing', question: 'Compare separate chaining and linear probing for collision resolution.', answer: 'Chaining stores colliding keys in a linked bucket/list outside the occupied slot. Linear probing searches subsequent table cells, `(h(k)+i) mod m`; it keeps entries in-table but can cause primary clustering.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'important', solved: false },
      ],
      revisions: [
        { title: 'Sorting quick comparison', category: 'comparison', content: 'Insertion: stable, in-place, O(n²) worst. Merge: stable, O(n log n), extra memory. Quick: average O(n log n), worst O(n²).', importance: 'must_study', code: 'for (int i = 1; i < a.length; i++) {\n  int key = a[i], j = i - 1;\n  while (j >= 0 && a[j] > key) a[j + 1] = a[j--];\n  a[j + 1] = key;\n}', language: 'java' },
        { title: 'Binary search', category: 'concept', content: 'Sorted input required; compare middle, discard half; time `O(log n)`.', importance: 'must_study' },
        { title: 'Open-address probing', category: 'formula', content: 'Linear probe: `(h(k)+i) mod m`; quadratic and double hashing change probe sequence.', importance: 'important' },
      ],
    },
  ],
  GAEST305: [
    {
      topics: ['Number systems and codes', 'Signed number representation', 'Logic gates and electrical limits'],
      mustStudy: ['binary/decimal conversions and signed range', 'two’s-complement arithmetic', 'gate truth tables and Boolean symbols'],
      important: ['fixed/floating representation', 'logic levels/noise margin'], additional: ['Verilog literal details'],
      evidence: 'The 2024-scheme syllabus directly includes number representations, arithmetic, gates and logic levels. The supplied PYQ PDF is truncated and could not be reliably extracted, so no past-paper frequency is claimed.',
      addendum: "### Number and gate essentials\n- For n-bit two’s complement, range is −2⁽ⁿ⁻¹⁾ to 2⁽ⁿ⁻¹⁾−1.\n- To negate: invert bits and add 1. Overflow occurs when same-sign operands produce a result with the opposite sign.\n- NAND = ¬(AB); NOR = ¬(A+B); both are universal gates.\n- Noise margin: low VIL−VOL; high VOH−VIH under standard guaranteed-level notation.\n- **Must Study:** conversions, signed range/operations, gate truth tables.\n- **Important:** logic levels/noise margin and codes.\n- **Additional:** literal syntax details.\n- Basis: syllabus and supplied question-bank/model-paper topic coverage; source PDF extraction limitations mean paper frequency is unverified.",
      questions: [
        { topic: 'Two’s complement', question: 'What is the signed range of an 8-bit two’s-complement number? Represent −5.', answer: 'Range is `−2⁷` to `2⁷−1`, i.e. −128 to 127. +5 is `00000101`; invert and add 1 gives −5=`11111011`.', type: 'numerical', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`−2^(n−1) … 2^(n−1)−1`' },
        { topic: 'Logic gates', question: 'Why are NAND and NOR called universal gates?', answer: 'Each gate alone can implement NOT, AND and OR (using De Morgan’s law), so any Boolean function can be built using only NAND gates or only NOR gates.', type: 'short_answer', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Signed representations', question: 'Compare sign-magnitude and two’s-complement representations.', answer: 'Sign-magnitude uses a sign bit and magnitude and has positive/negative zero; two’s complement uses modular representation, has one zero and simpler addition/subtraction. For n bits, its range is asymmetric: −2^(n−1) to 2^(n−1)−1.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'important', solved: false },
        { topic: 'Number conversion', question: 'Convert binary `101101` to decimal and hexadecimal.', answer: 'Decimal=`32+8+4+1=45`. Group as `0010 1101`: hexadecimal=`2D`.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'must_study', solved: false },
      ],
      revisions: [
        { title: 'Two’s-complement range', category: 'formula', content: 'n bits: `−2^(n−1)` to `2^(n−1)−1`. Negate by invert + 1.', importance: 'must_study' },
        { title: 'Universal gates', category: 'concept', content: 'NAND and NOR alone can build NOT, AND, OR, then any Boolean function.', importance: 'must_study' },
        { title: 'Overflow test', category: 'faq', content: 'In signed addition, overflow when same-sign inputs give an opposite-sign result.', importance: 'important' },
      ],
    },
    {
      topics: ['Boolean algebra', 'Canonical SOP/POS', 'Karnaugh maps'],
      mustStudy: ['Boolean laws and De Morgan', 'canonical minterm/maxterm notation', 'K-map grouping and don’t-care use'],
      important: ['code converters and simplification'], additional: ['Verilog continuous assignment details'],
      evidence: 'These are the central Module 2 syllabus outcomes and question-bank topics. The supplied DELD exam PDF is malformed, so the tier is not presented as measured PYQ frequency.',
      addendum: "### K-map rules\n- SOP groups 1s; POS groups 0s. Group sizes are powers of two: 1, 2, 4, 8…\n- Use the largest groups, allow wraparound, and overlap when it reduces literals. Every required 1/0 must be covered.\n- A don’t-care may be used as 0 or 1 if it makes a simpler expression; it need not be covered.\n- **Must Study:** laws, canonical forms, K-map minimization.\n- **Important:** code conversion and don’t-care strategy.\n- **Additional:** continuous-assignment syntax.\n- Basis: explicit syllabus/question-bank coverage; no verified exam recurrence due truncated paper.",
      questions: [
        { topic: 'Canonical forms', question: 'Define minterm and maxterm. Which one is used to write canonical SOP?', answer: 'A minterm is an AND term containing every variable once (complemented or not); it is 1 for one input row. Canonical SOP is the OR of minterms where the function is 1. A maxterm is an OR term that is 0 for one row and forms canonical POS.', type: 'definition', marks: 3, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'K-map simplification', question: 'State the rules for grouping 1-cells in a 4-variable K-map for SOP minimization.', answer: 'Make rectangular groups of 1,2,4,8 or 16 adjacent cells; choose large groups; wrap edges are adjacent; overlap is allowed; cover every required 1. A variable that changes within a group is eliminated.', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true },
        { topic: 'SOP and POS', question: 'Compare canonical SOP and canonical POS.', answer: 'Canonical SOP ORs minterms for truth-table rows where F=1. Canonical POS ANDs maxterms for rows where F=0. Both include every variable in each term.', type: 'comparison', marks: 3, difficulty: 'easy', importance: 'must_study', solved: false },
        { topic: 'K-map grouping', question: 'A 4-cell K-map group contains minterms 8,9,10,11 for variables A,B,C,D. What term remains?', answer: 'Binary rows 1000,1001,1010,1011 keep A=1 and C=0; B and D change. The simplified term is `A C′`.', type: 'problem_solving', marks: 3, difficulty: 'medium', importance: 'important', solved: false, formula: 'Keep only variables constant within a group' },
      ],
      revisions: [
        { title: 'K-map grouping', category: 'diagram', content: 'Group 1s for SOP or 0s for POS in powers of two. Wrap edges; remove variables that change.', importance: 'must_study' },
        { title: 'SOP / POS', category: 'comparison', content: 'SOP = OR of product terms/minterms for 1 rows. POS = AND of sum terms/maxterms for 0 rows.', importance: 'must_study' },
        { title: 'Don’t-care cells', category: 'concept', content: 'Use X as 0 or 1 only when it simplifies the expression; otherwise ignore it.', importance: 'important' },
      ],
    },
    {
      topics: ['Combinational logic blocks', 'Adders and subtractors', 'MUX/decoder/encoder'],
      mustStudy: ['half/full adder equations and truth tables', 'MUX selection and decoder outputs', 'combinational block design'],
      important: ['comparators and encoders'], additional: ['structural Verilog organization'],
      evidence: 'The syllabus names adders, subtractors, comparators, decoders, encoders and multiplexers; question-bank/model practice supports design and truth-table tasks. The PYQ scan is not extractable.',
      addendum: "### Core equations\n- Half adder: S=A⊕B, C=AB.\n- Full adder: S=A⊕B⊕Cin; Cout=AB+ACin+BCin.\n- A 2:1 MUX: Y= S′I₀ + SI₁.\n- Decoder: n input bits select at most 2ⁿ mutually exclusive outputs.\n- **Must Study:** adder equations/truth table, MUX selection, decoder behavior.\n- **Important:** comparators/encoders.\n- **Additional:** structural Verilog style.\n- Basis: direct syllabus outcomes; no unsupported frequency claim.",
      questions: [
        { topic: 'Full adder', question: 'Write the sum and carry equations of a full adder.', answer: '`S=A⊕B⊕Cin`. `Cout=AB+ACin+BCin` (equivalently `AB+Cin(A⊕B)`).', type: 'short_answer', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, formula: '`S=A⊕B⊕Cin`; `Cout=AB+ACin+BCin`' },
        { topic: 'Multiplexer', question: 'A 2:1 MUX has S=1, I0=0, I1=1. Find Y and give the general expression.', answer: 'When S=1, the MUX selects I1, so Y=1. General expression: `Y=S′I0+SI1`.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, formula: '`Y=S′I₀+SI₁`' },
        { topic: 'Combinational circuits', question: 'Compare a decoder and an encoder.', answer: 'A decoder maps an n-bit code to one of up to 2ⁿ outputs. An encoder maps one active input among 2ⁿ inputs to an n-bit code (a priority encoder resolves multiple active inputs).', type: 'comparison', marks: 3, difficulty: 'easy', importance: 'important', solved: false },
        { topic: 'Full adder design', question: 'How can a full adder be built from two half adders and an OR gate?', answer: 'First half adder combines A and B to give S1 and C1. Second combines S1 and Cin to give S and C2. Final carry is `C1 OR C2`.', type: 'diagram', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false, detail: 'A,B → HA1 → S1,C1; S1,Cin → HA2 → S,C2; C1,C2 → OR → Cout.', diagramKey: 'full-adder' },
      ],
      revisions: [
        { title: 'Full-adder equations', category: 'formula', content: '`S=A⊕B⊕Cin`; `Cout=AB+ACin+BCin`.', importance: 'must_study' },
        { title: 'MUX selection', category: 'formula', content: '2:1 MUX: `Y=S′I0+SI1`; S=0 selects I0; S=1 selects I1.', importance: 'must_study' },
        { title: 'Decoder vs encoder', category: 'comparison', content: 'Decoder: code → one-of-many output. Encoder: one-of-many input → code.', importance: 'important' },
      ],
    },
    {
      topics: ['Latches and flip-flops', 'Timing and counters', 'FSM and Verilog procedures'],
      mustStudy: ['flip-flop operation and timing constraints', 'synchronous versus ripple counters', 'FSM design sequence and state transitions'],
      important: ['shift registers and clock dividers'], additional: ['testbench/procedural syntax details'],
      evidence: 'The syllabus explicitly includes latches/flip-flops, setup/hold timing, counters, FSMs and Verilog testbenches. The paper PDF cannot be reliably read, so priority is syllabus-based.',
      addendum: "### Sequential-circuit checklist\n- Setup time: input stable before active clock edge. Hold time: input stable after it.\n- For a mod-M counter, minimum flip-flops n=⌈log₂M⌉.\n- FSM flow: specification → states → state diagram/table → encoding → next-state/output logic → simplify → implement/test.\n- **Must Study:** flip-flop behavior, setup/hold, synchronous counter and FSM design.\n- **Important:** ripple counters, shift registers, clock divider.\n- **Additional:** procedural-block/testbench details.\n- Basis: exact stated syllabus outcomes; frequency not verified.",
      questions: [
        { topic: 'Setup and hold time', question: 'Define setup time and hold time for a flip-flop.', answer: 'Setup time is the minimum time data must be stable before the active clock edge. Hold time is the minimum time it must remain stable after the edge.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Counters', question: 'How many flip-flops are needed for a mod-10 binary counter?', answer: '`n=ceil(log₂10)=4`, because 3 bits represent only 8 states while 4 bits represent 16.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, formula: '`n=⌈log₂M⌉`' },
        { topic: 'Synchronous and ripple counters', question: 'Compare synchronous and ripple counters by clocking and delay.', answer: 'In a ripple counter only the first flip-flop receives the external clock; later stages are triggered by earlier outputs, so propagation delays accumulate. In a synchronous counter all flip-flops share the clock and combinational logic determines toggles, reducing accumulated ripple delay.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'important', solved: false },
        { topic: 'FSM design', question: 'List the main steps for designing a finite-state machine from a specification.', answer: 'Identify states and inputs/outputs; draw state diagram/table; choose encoding; derive next-state and output equations; simplify; implement with flip-flops/logic; verify with testbench.', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false, detail: 'Sketch the state transition graph with directed, labeled edges.' },
      ],
      revisions: [
        { title: 'Timing constraints', category: 'definition', content: 'Setup: data stable before clock edge. Hold: data stable after edge.', importance: 'must_study' },
        { title: 'FSM workflow', category: 'concept', content: 'Specification → states → diagram/table → encoding → logic equations → circuit → test.', importance: 'must_study' },
        { title: 'Counter width', category: 'formula', content: 'For M states, use `⌈log₂M⌉` flip-flops minimum.', importance: 'important' },
      ],
    },
  ],
  UCHUT346: [
    {
      topics: ['Economic choices and demand', 'Elasticity and equilibrium', 'Production and utility'],
      mustStudy: ['demand/supply equilibrium', 'price elasticity calculation and meaning', 'utility and diminishing marginal utility'],
      important: ['PPC/opportunity cost and production functions'], additional: ['terminology examples'],
      evidence: 'Module 1 priorities follow the official syllabus and supplied question bank. The supplied model paper is image-only in available extraction and no separate Economics PYQ was included; exam frequency is therefore unverified.',
      addendum: "### Economics formulas\n- Price elasticity: Ed=(%ΔQd)/(%ΔP) (often negative; report magnitude when asked).\n- Linear demand Qd=a−bP and supply Qs=c+dP meet where Qd=Qs.\n- Opportunity cost is the next-best option given up. PPC points on the curve are efficient; inside is underused; outside is unattainable with current resources.\n- **Must Study:** equilibrium, elasticity and utility law.\n- **Important:** PPC, production and returns.\n- **Additional:** examples/terminology.\n- Basis: syllabus and supplied Q bank; no paper-frequency claim.",
      questions: [
        { topic: 'Price elasticity', question: 'Price rises from 10 to 12 and quantity demanded falls from 100 to 80. Compute arc elasticity using midpoint percentages.', answer: '`%ΔQ=−20/90=−0.2222`; `%ΔP=2/11=0.1818`; elasticity≈`−1.22`. Demand is elastic in magnitude because |Ed|>1.', type: 'numerical', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`Ed=(ΔQ/average Q)/(ΔP/average P)`' },
        { topic: 'Equilibrium', question: 'If Qd=100−2P and Qs=20+2P, find equilibrium price and quantity.', answer: 'Set `100−2P=20+2P`; `80=4P`, so `P=20`. Then `Q=60`.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Utility', question: 'State the law of diminishing marginal utility and one assumption.', answer: 'As a consumer consumes more units of a good in a period, marginal utility from each additional unit tends to fall, other things equal. It assumes comparable units and stable preferences/conditions during consumption.', type: 'short_answer', marks: 3, difficulty: 'easy', importance: 'important', solved: false },
        { topic: 'PPC', question: 'What does a point inside, on and outside a production possibility curve mean?', answer: 'On the PPC: efficient use of current resources. Inside: feasible but inefficient/underused resources. Outside: unattainable with current resources and technology.', type: 'diagram', marks: 3, difficulty: 'easy', importance: 'important', solved: false, detail: 'Draw a bowed-out frontier; label one point inside, one on it and one outside.', diagramKey: 'ppc' },
      ],
      revisions: [
        { title: 'Demand elasticity', category: 'formula', content: '`Ed=(% change Qd)/(% change P)`. |Ed|>1 elastic; <1 inelastic; =1 unit elastic.', importance: 'must_study' },
        { title: 'Equilibrium', category: 'concept', content: 'Market equilibrium occurs where `Qd=Qs`; excess demand pushes price up, excess supply tends to push it down.', importance: 'must_study' },
        { title: 'PPC zones', category: 'diagram', content: 'On curve: efficient; inside: inefficient/underused; outside: not currently feasible.', importance: 'important' },
      ],
    },
    {
      topics: ['Costs and revenue', 'Break-even analysis', 'Market structures'],
      mustStudy: ['fixed/variable/total/marginal cost and curves', 'break-even formula and contribution', 'market structure comparison'],
      important: ['revenue and profit conditions', 'oligopoly/kinked demand'], additional: ['curve-shape assumptions'],
      evidence: 'Priorities are mapped to Module 2 syllabus outcomes and the supplied question-bank/model-paper material. Since the model PDF is scanned, no frequency is claimed.',
      addendum: "### Cost and break-even formulas\n- TC=TFC+TVC; AC=TC/Q; MC=ΔTC/ΔQ.\n- Contribution/unit =P−variable cost/unit.\n- Break-even units =Fixed Cost / Contribution per unit.\n| Structure | Sellers | Product/entry |\n|---|---|---|\n| Perfect competition | Many | Homogeneous/easy entry |\n| Monopoly | One | Strong entry barrier |\n| Oligopoly | Few | Strategic interdependence |\n- **Must Study:** costs, BEP, structure comparison.\n- **Important:** revenue/profit and kinked demand.\n- **Additional:** curve assumptions.",
      questions: [
        { topic: 'Break-even analysis', question: 'Fixed cost is ₹12,000, selling price ₹100 and variable cost ₹60 per unit. Find break-even output.', answer: 'Contribution/unit=`100−60=₹40`. BEP=`12,000/40=300 units`.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, formula: '`BEP units=Fixed Cost/(Price−Variable Cost per unit)`' },
        { topic: 'Cost concepts', question: 'Define fixed cost, variable cost and marginal cost.', answer: 'Fixed cost does not change with output in the short run. Variable cost changes with output. Marginal cost is the change in total cost from producing one more unit (or `ΔTC/ΔQ`).', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Market structures', question: 'Compare perfect competition, monopoly and oligopoly by number of firms and strategic behavior.', answer: 'Perfect competition has many small firms and no single-firm price control. Monopoly has one dominant seller and high entry barriers. Oligopoly has a few interdependent firms whose decisions account for rivals.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'must_study', solved: false },
        { topic: 'Oligopoly', question: 'What is the kinked-demand explanation of price rigidity in oligopoly?', answer: 'The model assumes rivals match a price cut but do not match a price rise. Demand is more elastic above the current price and less elastic below it, creating a kink and a discontinuity in marginal revenue; small cost changes may not change price.', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'important', solved: false },
      ],
      revisions: [
        { title: 'Cost concepts', category: 'formula', content: '`TC=TFC+TVC`; `AC=TC/Q`; `MC=ΔTC/ΔQ`.', importance: 'must_study' },
        { title: 'Break-even', category: 'formula', content: '`BEP units=Fixed Cost/Contribution per unit`; contribution=`Price−Variable Cost/unit`.', importance: 'must_study' },
        { title: 'Market structure cues', category: 'comparison', content: 'Perfect competition: many firms. Monopoly: one. Oligopoly: few and interdependent.', importance: 'important' },
      ],
    },
    {
      topics: ['National income accounting', 'Inflation', 'Monetary and fiscal policy'],
      mustStudy: ['GDP/GNP/NNP and measurement methods', 'inflation/index interpretation', 'policy tools and repo rates'],
      important: ['nominal versus real values'], additional: ['accounting limitations'],
      evidence: 'Priorities follow the official Module 3 syllabus and supplied Economics question bank. Image-only model-paper text prevents a reliable past-paper frequency statement.',
      addendum: "### National-income and policy cues\n- GDP counts final production within a country’s borders; GNP adjusts GDP for net factor income from abroad; NNP=GNP−depreciation.\n- Expenditure method: GDP=C+I+G+(X−M).\n- Inflation is a sustained general price-level rise; CPI tracks a consumer basket.\n- Repo rate: rate at which the central bank lends short-term funds to banks against eligible securities; monetary policy changes liquidity/credit conditions.\n- **Must Study:** national-income terms/methods, inflation, monetary/fiscal tools.\n- **Important:** nominal vs real and repo-rate effects.\n- **Additional:** measurement limitations.",
      questions: [
        { topic: 'GDP calculation', question: 'Using the expenditure method, C=500, I=120, G=180, X=70 and M=90. Find GDP.', answer: '`GDP=C+I+G+(X−M)=500+120+180+(70−90)=780`.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true, formula: '`GDP=C+I+G+(X−M)`' },
        { topic: 'National income terms', question: 'Differentiate GDP, GNP and NNP.', answer: 'GDP measures final output within domestic borders. GNP=`GDP+net factor income from abroad`. NNP=`GNP−depreciation`.', type: 'comparison', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Inflation', question: 'Define inflation and name a common consumer-price measure.', answer: 'Inflation is a sustained increase in the general price level, which lowers purchasing power of money. A Consumer Price Index tracks the cost of a representative consumer basket over time.', type: 'definition', marks: 3, difficulty: 'easy', importance: 'must_study', solved: false },
        { topic: 'Monetary policy', question: 'Explain how an increase in the repo rate can affect borrowing and demand.', answer: 'A higher repo rate raises banks’ funding cost. Lending rates may rise, discouraging some borrowing and spending/investment; this can reduce aggregate demand and inflation pressure, with lags and other factors.', type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'important', solved: false },
      ],
      revisions: [
        { title: 'National income formula', category: 'formula', content: '`GDP=C+I+G+(X−M)`; `GNP=GDP+net factor income abroad`; `NNP=GNP−depreciation`.', importance: 'must_study' },
        { title: 'Inflation', category: 'definition', content: 'Sustained general price rise; purchasing power falls. CPI measures a consumer basket.', importance: 'must_study' },
        { title: 'Policy tools', category: 'concept', content: 'Monetary policy uses interest/liquidity tools; fiscal policy uses government spending and taxes.', importance: 'important' },
      ],
    },
    {
      topics: ['Time value of money', 'Project appraisal', 'NPV, IRR and payback'],
      mustStudy: ['present/future value and discounting', 'NPV decision and benefit-cost ratio', 'payback/ARR/IRR comparison'],
      important: ['value-engineering process'], additional: ['limitations and decision assumptions'],
      evidence: 'Module 4 syllabus expressly lists TVM, NPV, benefit-cost, IRR, payback and ARR. The supplied model paper is scanned, so these are syllabus-based tiers without frequency claims.',
      addendum: "### Project appraisal formulas\n- Future value: FV=PV(1+i)^n; present value: PV=FV/(1+i)^n.\n- NPV=Σ CFₜ/(1+i)^t − initial investment; accept if NPV>0 at the required rate (subject to project assumptions).\n- Benefit-cost ratio compares discounted benefits with discounted costs; accept when >1 under the stated convention.\n- **Must Study:** discounting and NPV decision.\n- **Important:** B/C, IRR, payback, ARR comparison.\n- **Additional:** assumptions/limitations and value-engineering stages.",
      questions: [
        { topic: 'Net present value', question: 'An investment costs ₹1,000 and returns ₹600 at each year-end for two years. At 10%, calculate NPV and decide.', answer: '`NPV=600/1.1+600/1.21−1000≈545.45+495.87−1000=₹41.32`. NPV is positive, so accept under the 10% discount-rate criterion.', type: 'numerical', marks: 5, difficulty: 'medium', importance: 'must_study', solved: true, formula: '`NPV=Σ CFₜ/(1+i)^t−C₀`' },
        { topic: 'Time value of money', question: 'Why is ₹1 today worth more than ₹1 received one year later?', answer: 'Money today can earn a return, future cash has uncertainty, and inflation can reduce purchasing power. Discounting converts future cash to comparable present value.', type: 'short_answer', marks: 3, difficulty: 'easy', importance: 'must_study', solved: true },
        { topic: 'Appraisal methods', question: 'Compare NPV and payback period as project-selection methods.', answer: 'NPV discounts all project cash flows and measures value added in money; it uses the required return. Payback measures time to recover the initial outlay and is simple/liquidity-focused, but basic payback ignores cash flows after recovery and time value.', type: 'comparison', marks: 5, difficulty: 'medium', importance: 'important', solved: false },
        { topic: 'Benefit-cost ratio', question: 'Discounted benefits are ₹1.25 lakh and discounted costs are ₹1 lakh. Find B/C and state the decision.', answer: '`B/C=1.25/1.00=1.25`. Since it exceeds 1, benefits exceed costs on a discounted basis, so accept under this criterion.', type: 'numerical', marks: 3, difficulty: 'easy', importance: 'important', solved: false, formula: '`B/C=PV(benefits)/PV(costs)`' },
      ],
      revisions: [
        { title: 'NPV decision', category: 'formula', content: '`NPV=Σ CFₜ/(1+i)^t−C₀`; accept if NPV>0 at the required rate.', importance: 'must_study' },
        { title: 'Time value of money', category: 'formula', content: '`FV=PV(1+i)^n`; `PV=FV/(1+i)^n`.', importance: 'must_study' },
        { title: 'Appraisal methods', category: 'comparison', content: 'NPV includes discounted cash flows; payback focuses on recovery time; IRR is the rate where NPV=0.', importance: 'important' },
      ],
    },
  ],
};
