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

    default:
      return null;
  }
}
