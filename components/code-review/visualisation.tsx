"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Copy, RotateCcw, Play, Terminal, Download, Code } from "lucide-react"
import CodeMirror from '@uiw/react-codemirror'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { cn } from "@/lib/utils"

// Language imports
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { createTheme } from '@uiw/codemirror-themes'

interface InterpreterProps {
    initialCode?: string;
    language?: string;
    onBack?: () => void;
}

export default function Interpreter({ initialCode = "", language = "javascript", onBack }: InterpreterProps) {
    const [code, setCode] = useState(initialCode)
    const [selectedLanguage, setSelectedLanguage] = useState(language)
    const [output, setOutput] = useState("")
    const [isExecuting, setIsExecuting] = useState(false)
    const [history, setHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const outputRef = useRef<HTMLDivElement>(null)

    // Custom theme to match your website design
    const customTheme = createTheme({
        theme: 'dark',
        settings: {
            background: '#0f0f0f',
            foreground: '#d4d4d4',
            caret: '#ffffff',
            selection: '#264f78',
            selectionMatch: '#264f78',
            lineHighlight: '#1f1f1f',
            gutterBackground: '#0f0f0f',
            gutterForeground: '#6e6e6e',
        },
        styles: [
            { tag: tags.comment, color: '#6a9955' },
            { tag: tags.variableName, color: '#9cdcfe' },
            { tag: tags.definitionKeyword, color: '#4ec9b0' },
            { tag: tags.punctuation, color: '#d4d4d4' },
            { tag: tags.propertyName, color: '#9cdcfe' },
            { tag: tags.keyword, color: '#569cd6' },
            { tag: tags.string, color: '#ce9178' },
            { tag: tags.function(tags.variableName), color: '#dcdcaa' },
            { tag: tags.atom, color: '#569cd6' },
            { tag: tags.number, color: '#b5cea8' },
            { tag: tags.operator, color: '#d4d4d4' },
            { tag: tags.className, color: '#4ec9b0' },
        ],
    });

    // Comprehensive language extensions map
    const languageExtensions: Record<string, any> = {
        javascript: javascript({ jsx: true }),
        typescript: javascript({ jsx: true, typescript: true }),
        jsx: javascript({ jsx: true }),
        tsx: javascript({ jsx: true, typescript: true }),
        python: python(),
        markdown: markdown(),
        html: html(),
        css: css(),
        json: json(),
    }

    // Execute user code and show output
    const executeCode = async () => {
        setIsExecuting(true)
        setOutput("")

        try {
            let result = ""
            
            // Add the code to history
            if (!history.includes(code)) {
                setHistory(prev => [...prev, code])
                setHistoryIndex(history.length)
            }
            
            // Javascript/Typescript execution
            if (['javascript', 'typescript', 'jsx', 'tsx'].includes(selectedLanguage)) {
                try {
                    // Capture console.log outputs
                    const originalConsoleLog = console.log;
                    let logs: string[] = [];
                    
                    console.log = (...args) => {
                        logs.push(args.map(arg => 
                            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                        ).join(' '));
                        originalConsoleLog(...args);
                    };
                    
                    // Wrap in try/catch to capture runtime errors
                    try {
                        // Create a safe evaluation context
                        const evalCode = `
                            "use strict";
                            // Wrapping in async IIFE to allow top-level await
                            (async () => {
                                try {
                                    ${code}
                                    return { error: null };
                                } catch (e) {
                                    return { error: e.message };
                                }
                            })();
                        `;
                        
                        const evalResult = await eval(evalCode);
                        
                        if (evalResult && evalResult.error) {
                            result = `Error: ${evalResult.error}\n`;
                        } else if (logs.length > 0) {
                            result = logs.join('\n');
                        } else {
                            result = "Code executed successfully with no output.";
                        }
                    } catch (e: any) {
                        result = `Error: ${e.message}\n`;
                    }
                    
                    // Restore original console.log
                    console.log = originalConsoleLog;
                } catch (e: any) {
                    result = `Error: ${e.message}\n`;
                }
            } 
            // Python execution would require a backend service
            else if (selectedLanguage === 'python') {
                result = "Python execution requires a backend service.\n";
                result += "To integrate with a Python interpreter, you would need to:\n";
                result += "1. Set up a Python execution API endpoint\n";
                result += "2. Send the code to that endpoint\n";
                result += "3. Display the results returned from the server";
            }
            // HTML rendering
            else if (selectedLanguage === 'html') {
                result = "HTML Preview:\n\n";
                result += "To render HTML, you would need to:\n";
                result += "1. Create an iframe or shadow DOM\n";
                result += "2. Inject the HTML content\n";
                result += "3. Display the rendered result";
            }
            // CSS preview
            else if (selectedLanguage === 'css') {
                result = "CSS Preview:\n\n";
                result += "To preview CSS, you would need to:\n";
                result += "1. Create a preview container with sample HTML\n";
                result += "2. Apply the CSS styles\n";
                result += "3. Display the styled result";
            }
            // JSON validation
            else if (selectedLanguage === 'json') {
                try {
                    const parsed = JSON.parse(code);
                    result = "Valid JSON ✓\n\n";
                    result += JSON.stringify(parsed, null, 2);
                } catch (e: any) {
                    result = `Invalid JSON: ${e.message}`;
                }
            }
            
            setOutput(result)
        } catch (error: any) {
            setOutput(`Error: ${error.message}`)
        } finally {
            setIsExecuting(false)
            
            // Auto-scroll output to the bottom
            if (outputRef.current) {
                setTimeout(() => {
                    if (outputRef.current) {
                        outputRef.current.scrollTop = outputRef.current.scrollHeight
                    }
                }, 100)
            }
        }
    }

    const handleCodeChange = (value: string) => {
        setCode(value)
    }

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLanguage(e.target.value)
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output)
    }

    const downloadOutput = () => {
        const element = document.createElement("a")
        const file = new Blob([output], { type: 'text/plain' })
        element.href = URL.createObjectURL(file)
        element.download = `output.txt`
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    const resetCode = () => {
        setCode(initialCode)
        setOutput("")
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 font-mono">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/70 hover:bg-gray-700/90 rounded-md text-sm font-medium text-gray-300 transition-colors"
                            >
                                <Code size={14} className="rotate-180" /> Back to Editor
                            </button>
                        )}
                        <h2 className="text-2xl font-bold text-white/90">Interactive Interpreter</h2>
                    </div>

                    <div className="relative inline-block w-42">
                        <select
                            value={selectedLanguage}
                            onChange={handleLanguageChange}
                            className="appearance-none w-full bg-black text-white border border-white px-4 py-2 pr-10 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-white"
                        >
                            <optgroup label="Popular">
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="python">Python</option>
                                <option value="html">HTML</option>
                                <option value="css">CSS</option>
                                <option value="json">JSON</option>
                            </optgroup>
                            <optgroup label="JSX/React">
                                <option value="jsx">JSX</option>
                                <option value="tsx">TSX</option>
                            </optgroup>
                        </select>

                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg
                                className="w-4 h-4 text-white"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Dual Panel Layout - Code Editor and Output */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Editor Section */}
                    <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#0a0a0a]">
                        <div className="bg-[#0d0d0d] px-4 py-2 flex justify-between items-center">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <button
                                onClick={executeCode}
                                disabled={isExecuting}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors",
                                    isExecuting 
                                        ? "bg-blue-900/30 text-blue-300/50 cursor-not-allowed"
                                        : "bg-blue-900/40 hover:bg-blue-800/60 text-blue-200"
                                )}
                            >
                                {isExecuting ? (
                                    <>
                                        <span className="animate-pulse">Executing</span>
                                        <span className="w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-full animate-spin"></span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={14} /> Run Code
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="overflow-hidden">
                            <CodeMirror
                                value={code}
                                height="400px"
                                theme={customTheme}
                                extensions={[languageExtensions[selectedLanguage] || []]}
                                onChange={handleCodeChange}
                                basicSetup={{
                                    foldGutter: true,
                                    dropCursor: true,
                                    allowMultipleSelections: true,
                                    indentOnInput: true,
                                    lineNumbers: true,
                                    highlightActiveLineGutter: true,
                                    highlightActiveLine: true,
                                    syntaxHighlighting: true,
                                }}
                                className="text-base"
                            />
                        </div>

                        <div className="bg-[#0d0d0d] px-4 py-2 flex justify-between items-center border-t border-gray-900">
                            <div className="flex space-x-3">
                                <button
                                    onClick={resetCode}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/70 hover:bg-gray-700/90 rounded-md text-sm font-medium text-gray-300 transition-colors"
                                >
                                    <RotateCcw size={14} /> Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Output Console */}
                    <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#0a0a0a]">
                        <div className="bg-[#0d0d0d] px-4 py-2 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-400">Console Output</span>
                            </div>
                            
                            <div className="flex space-x-2">
                                <button
                                    onClick={copyToClipboard}
                                    disabled={!output}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                                        output 
                                            ? "bg-gray-800/70 hover:bg-gray-700/90 text-gray-300" 
                                            : "bg-gray-800/30 text-gray-500 cursor-not-allowed"
                                    )}
                                >
                                    <Copy size={12} /> Copy
                                </button>
                                <button
                                    onClick={downloadOutput}
                                    disabled={!output}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                                        output 
                                            ? "bg-gray-800/70 hover:bg-gray-700/90 text-gray-300" 
                                            : "bg-gray-800/30 text-gray-500 cursor-not-allowed"
                                    )}
                                >
                                    <Download size={12} /> Save
                                </button>
                            </div>
                        </div>

                        <div 
                            ref={outputRef}
                            className="h-[400px] p-4 font-mono text-sm text-white overflow-auto bg-[#0f0f0f]"
                        >
                            {isExecuting ? (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="w-3 h-3 border-t-2 border-r-2 border-blue-400 rounded-full animate-spin"></span>
                                    Executing...
                                </div>
                            ) : output ? (
                                <pre className="whitespace-pre-wrap">{output}</pre>
                            ) : (
                                <div className="text-gray-500 italic">Output will appear here when you run your code.</div>
                            )}
                        </div>

                        <div className="bg-[#0d0d0d] px-4 py-2 border-t border-gray-900 text-xs text-gray-500">
                            Press the Run button or use Shift+Enter to execute code
                        </div>
                    </div>
                </div>
            </motion.div>

            <footer className="w-full border-t border-gray-800/50 mt-10 pt-6 text-center text-xs text-gray-500 font-mono">
                <p className="opacity-60">
                    {"//"} handcrafted with logic & caffeine — dedicated to M<br />
                    Made by <a href="https://saikarthikketha.tech" className="underline text-white hover:text-blue-400 transition-colors">Sai Karthik Ketha</a>
                </p>
            </footer>
        </div>
    )
}