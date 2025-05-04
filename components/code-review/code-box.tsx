import React, { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Copy, Download, RotateCcw } from "lucide-react"
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
import { xml } from '@codemirror/lang-xml'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { php } from '@codemirror/lang-php'
import { rust } from '@codemirror/lang-rust'
import { sql } from '@codemirror/lang-sql'
import { wast } from '@codemirror/lang-wast'
import { lezer } from '@codemirror/lang-lezer'
import { vue } from '@codemirror/lang-vue'
import { sass } from '@codemirror/lang-sass'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { createTheme } from '@uiw/codemirror-themes'

interface CodeBoxProps {
    initialCode?: string;
    language?: string;
    onCodeChange?: (code: string, language: string) => void;
}

export default function CodeBox({ initialCode = "", language = "javascript", onCodeChange }: CodeBoxProps) {
    const [code, setCode] = useState(initialCode)
    const [selectedLanguage, setSelectedLanguage] = useState(language)

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
            { tag: [tags.function(tags.variableName)], color: '#dcdcaa' },
            { tag: tags.atom, color: '#569cd6' }, // Use atom tag for boolean values
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
        xml: xml(),
        cpp: cpp(),
        java: java(),
        php: php(),
        rust: rust(),
        sql: sql(),
        wasm: wast(),
        lezer: lezer(),
        vue: vue(),
        sass: sass(),
    }

    // File extensions for download
    const fileExtensions: Record<string, string> = {
        javascript: 'js',
        typescript: 'ts',
        jsx: 'jsx',
        tsx: 'tsx',
        python: 'py',
        markdown: 'md',
        html: 'html',
        css: 'css',
        json: 'json',
        xml: 'xml',
        cpp: 'cpp',
        java: 'java',
        php: 'php',
        rust: 'rs',
        sql: 'sql',
        wasm: 'wat',
        lezer: 'lezer',
        vue: 'vue',
        sass: 'scss',
    }

    // Language categories for dropdown organization
    const languageCategories = [
        {
            name: "Web Development",
            languages: ["javascript", "typescript", "jsx", "tsx", "html", "css", "json", "vue", "sass"]
        },
        {
            name: "System Programming",
            languages: ["cpp", "rust", "java"]
        },
        {
            name: "Scripting",
            languages: ["python", "php"]
        },
        {
            name: "Data & Markup",
            languages: ["sql", "xml", "markdown", "json"]
        },
        {
            name: "Other",
            languages: ["wasm", "lezer"]
        }
    ]

    const handleCodeChange = (value: string) => {
        setCode(value)
        if (onCodeChange) {
            onCodeChange(value, selectedLanguage)
        }
    }

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value
        setSelectedLanguage(newLanguage)
        if (onCodeChange) {
            onCodeChange(code, newLanguage)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code)
    }

    const downloadCode = () => {
        const element = document.createElement("a")
        const file = new Blob([code], { type: 'text/plain' })
        element.href = URL.createObjectURL(file)
        element.download = `code.${fileExtensions[selectedLanguage] || 'txt'}`
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    const resetCode = () => {
        setCode(initialCode)
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
                    <h2 className="text-2xl font-bold text-white/90">Interactive Code Editor</h2>

                    <div className="relative inline-block w-35">
                        <select
                            value={selectedLanguage}
                            onChange={handleLanguageChange}
                            className="appearance-none w-full bg-black text-white border border-white px-4 py-2 pr-10 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-white"
                        >
                            {languageCategories.map((category) => (
                                <optgroup key={category.name} label={category.name}>
                                    {category.languages.map((lang) => (
                                        <option key={lang} value={lang}>
                                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
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

                {/* Editor Section - Now Full Width */}
                <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#0a0a0a]">
                    <div className="bg-[#0d0d0d] px-4 py-2 flex justify-between items-center">
                        <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">
                            {fileExtensions[selectedLanguage] || 'txt'}
                        </span>
                    </div>

                    <div className="overflow-hidden">
                        <CodeMirror
                            value={code}
                            height="500px" // Increased height since we have more space now
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

                        <div className="flex space-x-2">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-1 px-2 py-1 bg-gray-800/70 hover:bg-gray-700/90 rounded-md text-xs text-gray-300 transition-colors"
                            >
                                <Copy size={12} /> Copy
                            </button>
                            <button
                                onClick={downloadCode}
                                className="flex items-center gap-1 px-2 py-1 bg-gray-800/70 hover:bg-gray-700/90 rounded-md text-xs text-gray-300 transition-colors"
                            >
                                <Download size={12} /> Download
                            </button>
                        </div>
                    </div>
                </div>

                
            </motion.div>

            
        </div>
    )
}