import React from 'react';

interface DiagramProps {
  diagramKey: string;
}

export function DiagramGallery({ diagramKey }: DiagramProps) {
  switch (diagramKey) {
    case 'jvm-architecture':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Diagram: Java Compilation & JVM Execution Flow
          </div>
          <svg viewBox="0 0 720 170" className="w-full h-auto" role="img" aria-label="Java compilation to JVM execution">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
                <polygon points="0 0, 8 3.5, 0 7" fill="#6366f1" />
              </marker>
            </defs>
            <rect x="15" y="45" width="135" height="68" rx="10" fill="#eef2ff" stroke="#6366f1" strokeWidth="1.5" />
            <text x="82" y="74" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e1b4b">Source Code</text>
            <text x="82" y="94" textAnchor="middle" fontSize="11" fill="#4338ca">Main.java</text>

            <line x1="150" y1="79" x2="195" y2="79" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow)" />

            <rect x="200" y="45" width="125" height="68" rx="10" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
            <text x="262" y="74" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e3a8a">Compiler</text>
            <text x="262" y="94" textAnchor="middle" fontSize="11" fill="#1d4ed8">javac</text>

            <line x1="325" y1="79" x2="370" y2="79" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow)" />

            <rect x="375" y="45" width="135" height="68" rx="10" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
            <text x="442" y="74" textAnchor="middle" fontSize="13" fontWeight="700" fill="#064e3b">Bytecode</text>
            <text x="442" y="94" textAnchor="middle" fontSize="11" fill="#047857">Main.class (WORA)</text>

            <line x1="510" y1="79" x2="555" y2="79" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow)" />

            <rect x="560" y="25" width="145" height="108" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
            <text x="632" y="52" textAnchor="middle" fontSize="13" fontWeight="700" fill="#78350f">JVM (OS Specific)</text>
            <text x="632" y="73" textAnchor="middle" fontSize="10.5" fill="#92400e">Class Loader</text>
            <text x="632" y="91" textAnchor="middle" fontSize="10.5" fill="#92400e">Bytecode Verifier</text>
            <text x="632" y="109" textAnchor="middle" fontSize="10.5" fill="#92400e">Interpreter + JIT</text>

            <text x="360" y="152" textAnchor="middle" fontSize="11" fill="#64748b">
              Same .class bytecode runs on Windows, Linux, and macOS via each platform&apos;s JVM
            </text>
          </svg>
        </div>
      );

    case 'inheritance-dispatch':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Diagram: Constructor Order &amp; Dynamic Method Dispatch
          </div>
          <svg viewBox="0 0 680 185" className="w-full h-auto" role="img" aria-label="Inheritance hierarchy and constructor calling order">
            <rect x="235" y="14" width="210" height="44" rx="8" fill="#eef2ff" stroke="#4f46e5" strokeWidth="1.5" />
            <text x="340" y="34" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#1e1b4b">Superclass: Shape</text>
            <text x="340" y="49" textAnchor="middle" fontSize="10.5" fill="#4338ca">draw() | 1st Constructor</text>

            <line x1="340" y1="58" x2="170" y2="98" stroke="#64748b" strokeWidth="1.6" />
            <line x1="340" y1="58" x2="510" y2="98" stroke="#64748b" strokeWidth="1.6" />

            <rect x="65" y="98" width="210" height="46" rx="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
            <text x="170" y="118" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#064e3b">Subclass: Circle</text>
            <text x="170" y="134" textAnchor="middle" fontSize="10.5" fill="#047857">@Override draw() | super()</text>

            <rect x="405" y="98" width="210" height="46" rx="8" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
            <text x="510" y="118" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#1e3a8a">Subclass: Rectangle</text>
            <text x="510" y="134" textAnchor="middle" fontSize="10.5" fill="#1d4ed8">@Override draw() | super()</text>

            <text x="340" y="170" textAnchor="middle" fontSize="11" fill="#64748b">
              Shape s = new Circle(); s.draw(); -&gt; Calls Circle.draw() at runtime (Dynamic Dispatch)
            </text>
          </svg>
        </div>
      );

    case 'exception-hierarchy':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Diagram: Java Throwable &amp; Exception Hierarchy
          </div>
          <svg viewBox="0 0 700 215" className="w-full h-auto" role="img" aria-label="Java exception hierarchy">
            <rect x="275" y="10" width="150" height="36" rx="8" fill="#eef2ff" stroke="#4f46e5" strokeWidth="1.5" />
            <text x="350" y="33" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#1e1b4b">Throwable</text>

            <line x1="350" y1="46" x2="170" y2="76" stroke="#64748b" strokeWidth="1.5" />
            <line x1="350" y1="46" x2="510" y2="76" stroke="#64748b" strokeWidth="1.5" />

            <rect x="85" y="76" width="170" height="42" rx="8" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.5" />
            <text x="170" y="95" textAnchor="middle" fontSize="12" fontWeight="700" fill="#7f1d1d">Error (Fatal JVM)</text>
            <text x="170" y="110" textAnchor="middle" fontSize="10" fill="#b91c1c">OutOfMemoryError, StackOverflow</text>

            <rect x="425" y="76" width="170" height="38" rx="8" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
            <text x="510" y="100" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#1e3a8a">Exception</text>

            <line x1="510" y1="114" x2="360" y2="146" stroke="#64748b" strokeWidth="1.5" />
            <line x1="510" y1="114" x2="585" y2="146" stroke="#64748b" strokeWidth="1.5" />

            <rect x="240" y="146" width="215" height="52" rx="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
            <text x="347" y="166" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#78350f">Checked (Compile-Time)</text>
            <text x="347" y="184" textAnchor="middle" fontSize="10" fill="#92400e">IOException, SQLException</text>

            <rect x="480" y="146" width="205" height="52" rx="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
            <text x="582" y="166" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#064e3b">Unchecked (Runtime)</text>
            <text x="582" y="184" textAnchor="middle" fontSize="10" fill="#047857">Arithmetic, NullPointer, Index</text>
          </svg>
        </div>
      );

    case 'swing-mvc':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Diagram: Swing MVC &amp; Delegation Event Model
          </div>
          <svg viewBox="0 0 700 165" className="w-full h-auto" role="img" aria-label="Swing MVC and event handling">
            <rect x="30" y="40" width="175" height="72" rx="10" fill="#eef2ff" stroke="#4f46e5" strokeWidth="1.5" />
            <text x="117" y="68" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e1b4b">View (Swing UI)</text>
            <text x="117" y="88" textAnchor="middle" fontSize="10.5" fill="#4338ca">JFrame, JButton (Source)</text>

            <line x1="205" y1="68" x2="262" y2="68" stroke="#4f46e5" strokeWidth="2" />
            <text x="233" y="58" textAnchor="middle" fontSize="9.5" fill="#4f46e5">ActionEvent</text>

            <rect x="265" y="40" width="175" height="72" rx="10" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
            <text x="352" y="68" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e3a8a">Controller (Listener)</text>
            <text x="352" y="88" textAnchor="middle" fontSize="10.5" fill="#1d4ed8">actionPerformed()</text>

            <line x1="440" y1="68" x2="495" y2="68" stroke="#2563eb" strokeWidth="2" />
            <text x="467" y="58" textAnchor="middle" fontSize="9.5" fill="#2563eb">Updates</text>

            <rect x="500" y="40" width="170" height="72" rx="10" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
            <text x="585" y="68" textAnchor="middle" fontSize="13" fontWeight="700" fill="#064e3b">Model (Data)</text>
            <text x="585" y="88" textAnchor="middle" fontSize="10.5" fill="#047857">State / Business Logic</text>

            <text x="350" y="144" textAnchor="middle" fontSize="11" fill="#64748b">
              Delegation Event Model: Source generates Event Object -&gt; Dispatched to registered Listener
            </text>
          </svg>
        </div>
      );

    case 'jdbc-architecture':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Diagram: JDBC 5-Step Architecture Flow
          </div>
          <svg viewBox="0 0 720 155" className="w-full h-auto" role="img" aria-label="JDBC architecture">
            <rect x="18" y="38" width="135" height="64" rx="8" fill="#eef2ff" stroke="#4f46e5" strokeWidth="1.5" />
            <text x="85" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e1b4b">Java App</text>
            <text x="85" y="83" textAnchor="middle" fontSize="10" fill="#4338ca">PreparedStatement</text>

            <line x1="153" y1="70" x2="195" y2="70" stroke="#64748b" strokeWidth="1.8" />

            <rect x="198" y="38" width="150" height="64" rx="8" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
            <text x="273" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e3a8a">JDBC API</text>
            <text x="273" y="83" textAnchor="middle" fontSize="10" fill="#1d4ed8">DriverManager</text>

            <line x1="348" y1="70" x2="390" y2="70" stroke="#64748b" strokeWidth="1.8" />

            <rect x="393" y="38" width="145" height="64" rx="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
            <text x="465" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="#78350f">JDBC Driver</text>
            <text x="465" y="83" textAnchor="middle" fontSize="10" fill="#92400e">Vendor Protocol</text>

            <line x1="538" y1="70" x2="578" y2="70" stroke="#64748b" strokeWidth="1.8" />

            <rect x="580" y="38" width="120" height="64" rx="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
            <text x="640" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="#064e3b">Database</text>
            <text x="640" y="83" textAnchor="middle" fontSize="10" fill="#047857">MySQL / Postgres</text>

            <text x="360" y="135" textAnchor="middle" fontSize="11" fill="#64748b">
              Load Driver -&gt; getConnection() -&gt; prepareStatement() -&gt; executeQuery()/executeUpdate() -&gt; close()
            </text>
          </svg>
        </div>
      );

    case 'dfa-substring':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: DFA for substring AB</div>
          <svg viewBox="0 0 620 150" className="w-full h-auto" role="img" aria-label="DFA that accepts strings containing AB">
            <circle cx="110" cy="75" r="31" fill="#eef2ff" stroke="#4f46e5" strokeWidth="2" /><text x="110" y="80" textAnchor="middle" fontSize="14" fill="#1e1b4b">q0</text>
            <circle cx="300" cy="75" r="31" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" /><text x="300" y="80" textAnchor="middle" fontSize="14" fill="#1e3a8a">q1</text>
            <circle cx="500" cy="75" r="35" fill="#dcfce7" stroke="#059669" strokeWidth="2" /><circle cx="500" cy="75" r="29" fill="none" stroke="#059669" /><text x="500" y="80" textAnchor="middle" fontSize="14" fill="#064e3b">q2</text>
            <line x1="141" y1="67" x2="268" y2="67" stroke="#64748b" strokeWidth="2" /><text x="204" y="58" textAnchor="middle" fontSize="12">A</text>
            <line x1="331" y1="67" x2="463" y2="67" stroke="#64748b" strokeWidth="2" /><text x="397" y="58" textAnchor="middle" fontSize="12">B</text>
            <text x="110" y="132" textAnchor="middle" fontSize="11">B,C loop</text><text x="300" y="132" textAnchor="middle" fontSize="11">A loops; C→q0</text><text x="500" y="132" textAnchor="middle" fontSize="11">accept; all loop</text>
          </svg>
        </div>
      );

    case 'expression-tree':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: Expression tree for (a+b)*c</div>
          <svg viewBox="0 0 420 175" className="w-full h-auto" role="img" aria-label="Expression tree with multiplication at root">
            <line x1="210" y1="48" x2="130" y2="95" stroke="#64748b" strokeWidth="2" /><line x1="210" y1="48" x2="300" y2="95" stroke="#64748b" strokeWidth="2" />
            <line x1="130" y1="117" x2="80" y2="150" stroke="#64748b" strokeWidth="2" /><line x1="130" y1="117" x2="180" y2="150" stroke="#64748b" strokeWidth="2" />
            {[[210,35,'*'],[130,105,'+'],[300,105,'c'],[80,158,'a'],[180,158,'b']].map(([x,y,label])=><g key={String(label)+x}><circle cx={Number(x)} cy={Number(y)} r="19" fill="#eef2ff" stroke="#4f46e5" strokeWidth="1.5"/><text x={Number(x)} y={Number(y)+5} textAnchor="middle" fontSize="14">{label}</text></g>)}
          </svg>
        </div>
      );

    case 'full-adder':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: Full adder from two half adders</div>
          <svg viewBox="0 0 650 155" className="w-full h-auto" role="img" aria-label="Two half adders and an OR gate form a full adder">
            <rect x="150" y="25" width="130" height="55" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="215" y="50" textAnchor="middle" fontSize="13">Half Adder 1</text><text x="215" y="68" textAnchor="middle" fontSize="11">A,B → S1,C1</text>
            <rect x="345" y="25" width="130" height="55" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="410" y="50" textAnchor="middle" fontSize="13">Half Adder 2</text><text x="410" y="68" textAnchor="middle" fontSize="11">S1,Cin → S,C2</text>
            <rect x="505" y="95" width="95" height="42" rx="8" fill="#fef3c7" stroke="#d97706"/><text x="552" y="121" textAnchor="middle" fontSize="13">OR → Cout</text>
            <line x1="280" y1="52" x2="345" y2="52" stroke="#64748b" strokeWidth="2"/><text x="312" y="43" textAnchor="middle" fontSize="11">S1</text><line x1="280" y1="70" x2="505" y2="115" stroke="#64748b" strokeWidth="2"/><line x1="475" y1="70" x2="505" y2="115" stroke="#64748b" strokeWidth="2"/><text x="525" y="145" textAnchor="middle" fontSize="10">C1 OR C2</text>
          </svg>
        </div>
      );

    case 'ppc':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: Production possibility curve</div>
          <svg viewBox="0 0 440 210" className="w-full h-auto" role="img" aria-label="PPC showing efficient, inefficient and unattainable points">
            <line x1="55" y1="175" x2="395" y2="175" stroke="#475569" strokeWidth="2"/><line x1="55" y1="175" x2="55" y2="25" stroke="#475569" strokeWidth="2"/><path d="M70 45 Q150 80 215 122 Q285 157 370 165" fill="none" stroke="#4f46e5" strokeWidth="3"/><text x="260" y="198" textAnchor="middle" fontSize="11">Good X</text><text x="20" y="95" textAnchor="middle" fontSize="11" transform="rotate(-90 20 95)">Good Y</text>
            <circle cx="150" cy="145" r="5" fill="#d97706"/><text x="160" y="148" fontSize="11">Inside: underused</text><circle cx="260" cy="148" r="5" fill="#059669"/><text x="270" y="151" fontSize="11">On: efficient</text><circle cx="310" cy="72" r="5" fill="#dc2626"/><text x="320" y="75" fontSize="11">Outside</text>
          </svg>
        </div>
      );

    case 'markov-states':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: Two-state Markov chain</div>
          <svg viewBox="0 0 470 160" className="w-full h-auto" role="img" aria-label="Two-state Markov chain with self transitions">
            <circle cx="145" cy="88" r="35" fill="#eef2ff" stroke="#4f46e5" strokeWidth="2"/><text x="145" y="93" textAnchor="middle" fontSize="14">State 1</text>
            <circle cx="330" cy="88" r="35" fill="#dcfce7" stroke="#059669" strokeWidth="2"/><text x="330" y="93" textAnchor="middle" fontSize="14">State 2</text>
            <line x1="180" y1="78" x2="295" y2="78" stroke="#64748b" strokeWidth="2"/><text x="238" y="68" textAnchor="middle" fontSize="11">p₁₂</text>
            <line x1="295" y1="101" x2="180" y2="101" stroke="#64748b" strokeWidth="2"/><text x="238" y="120" textAnchor="middle" fontSize="11">p₂₁</text>
            <path d="M125 53 C83 15,173 15,165 56" fill="none" stroke="#94a3b8" strokeWidth="1.8"/><text x="145" y="20" textAnchor="middle" fontSize="10">p₁₁</text>
            <path d="M310 53 C268 15,358 15,350 56" fill="none" stroke="#94a3b8" strokeWidth="1.8"/><text x="330" y="20" textAnchor="middle" fontSize="10">p₂₂</text>
          </svg>
        </div>
      );

    case 'pda-anbn':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: PDA idea for aⁿbⁿ</div>
          <svg viewBox="0 0 620 150" className="w-full h-auto" role="img" aria-label="Push markers for a symbols and pop them for b symbols">
            <rect x="20" y="45" width="150" height="58" rx="8" fill="#eef2ff" stroke="#4f46e5"/><text x="95" y="70" textAnchor="middle" fontSize="13">Read a</text><text x="95" y="88" textAnchor="middle" fontSize="11">push X</text>
            <rect x="235" y="45" width="150" height="58" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="310" y="70" textAnchor="middle" fontSize="13">Read b</text><text x="310" y="88" textAnchor="middle" fontSize="11">pop X</text>
            <rect x="450" y="45" width="150" height="58" rx="8" fill="#dcfce7" stroke="#059669"/><text x="525" y="70" textAnchor="middle" fontSize="13">Input ends</text><text x="525" y="88" textAnchor="middle" fontSize="11">accept bottom marker</text>
            <line x1="170" y1="74" x2="235" y2="74" stroke="#64748b" strokeWidth="2"/><line x1="385" y1="74" x2="450" y2="74" stroke="#64748b" strokeWidth="2"/><text x="310" y="133" textAnchor="middle" fontSize="11">Reject if a b-order is broken or a stack marker remains</text>
          </svg>
        </div>
      );

    case 'turing-machine':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: Turing machine model</div>
          <svg viewBox="0 0 560 165" className="w-full h-auto" role="img" aria-label="Finite control connected to read-write head and tape">
            <rect x="205" y="8" width="150" height="42" rx="8" fill="#eef2ff" stroke="#4f46e5"/><text x="280" y="34" textAnchor="middle" fontSize="13">Finite control</text>
            <rect x="222" y="72" width="116" height="38" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="280" y="96" textAnchor="middle" fontSize="12">Read / write head</text><line x1="280" y1="50" x2="280" y2="72" stroke="#64748b" strokeWidth="2"/>
            {[80,160,240,320,400].map((x,i)=><g key={x}><rect x={x} y="122" width="70" height="32" fill={i===2?'#fef3c7':'#fff'} stroke="#64748b"/><text x={x+35} y="143" textAnchor="middle" fontSize="12">{['a','a','□','b','b'][i]}</text></g>)}<line x1="280" y1="110" x2="275" y2="122" stroke="#64748b" strokeWidth="2"/>
          </svg>
        </div>
      );

    case 'bst':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: Binary search tree order</div>
          <svg viewBox="0 0 430 170" className="w-full h-auto" role="img" aria-label="BST with left keys smaller and right keys larger">
            <line x1="215" y1="45" x2="130" y2="96" stroke="#64748b" strokeWidth="2"/><line x1="215" y1="45" x2="300" y2="96" stroke="#64748b" strokeWidth="2"/><line x1="130" y1="118" x2="85" y2="151" stroke="#64748b" strokeWidth="2"/><line x1="130" y1="118" x2="175" y2="151" stroke="#64748b" strokeWidth="2"/>
            {[[215,34,'8'],[130,108,'4'],[300,108,'12'],[85,158,'2'],[175,158,'6']].map(([x,y,label])=><g key={String(label)}><circle cx={Number(x)} cy={Number(y)} r="18" fill="#eef2ff" stroke="#4f46e5"/><text x={Number(x)} y={Number(y)+5} textAnchor="middle" fontSize="13">{label}</text></g>)}
          </svg>
        </div>
      );

    case 'fsm-flow':
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Diagram: FSM design flow</div>
          <svg viewBox="0 0 650 115" className="w-full h-auto" role="img" aria-label="FSM design stages from specification to test">
            {['Specification','States','Diagram / table','Logic + flip-flops','Test'].map((label,i)=>{const x=10+i*128;return <g key={label}><rect x={x} y="30" width="112" height="48" rx="8" fill={i===4?'#dcfce7':'#eef2ff'} stroke={i===4?'#059669':'#4f46e5'}/><text x={x+56} y="58" textAnchor="middle" fontSize="11">{label}</text>{i<4&&<line x1={x+112} y1="54" x2={x+128} y2="54" stroke="#64748b" strokeWidth="2"/>}</g>})}
          </svg>
        </div>
      );

    default:
      return null;
  }
}
