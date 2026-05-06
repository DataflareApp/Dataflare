// Date: 2026-03-11

import { monaco } from '../index'

export default {
    defaultToken: '',
    tokenPostfix: '.sql',
    ignoreCase: true,
    brackets: [
        { open: '[', close: ']', token: 'delimiter.square' },
        { open: '(', close: ')', token: 'delimiter.parenthesis' }
    ],
    keywords: [],
    builtinFunctions: [],
    literals: ['TRUE', 'FALSE', 'NULL'],
    tokenizer: {
        root: [
            { include: '@comments' },
            { include: '@whitespace' },
            [/\$\$/, { token: 'keyword', bracket: '@open', next: '@pythonBlock', nextEmbedded: 'python' }],
            { include: '@numbers' },
            { include: '@strings' },
            { include: '@delimitedIdentifier' },
            [/[;,.]/, 'delimiter'],
            [/[()]/, '@brackets'],
            [
                /([\w@#$]+)(\s*)(\()/,
                [
                    {
                        cases: {
                            '@builtinFunctions': 'predefined',
                            '@literals': 'literal',
                            '@keywords': 'keyword',
                            '@default': 'identifier'
                        }
                    },
                    'white',
                    '@brackets'
                ]
            ],
            [
                /[\w@#$]+/,
                {
                    cases: {
                        '@literals': 'literal',
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }
            ],
            [/[<>=!%&+\-*/|~^]/, 'operator']
        ],
        pythonBlock: [[/\$\$/, { token: 'keyword', next: '@popall', nextEmbedded: '@pop' }]],
        whitespace: [[/\s+/, 'white']],
        comments: [
            [/--+.*/, 'comment'],
            [/\/\*/, { token: 'comment.quote', next: '@comment' }]
        ],
        comment: [
            [/[^*/]+/, 'comment'],
            [/\/\*/, { token: 'comment.quote', next: '@comment' }],
            [/\*\//, { token: 'comment.quote', next: '@pop' }],
            [/./, 'comment']
        ],
        numbers: [
            [/0[xX][0-9a-fA-F]*/, 'number'],
            [/[$][+-]*\d*(\.\d*)?/, 'number'],
            [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, 'number']
        ],
        strings: [
            [/[rR]'/, { token: 'string', next: '@singleQuoteString' }],
            [/'/, { token: 'string', next: '@singleQuoteString' }],
            [/[rR]"/, { token: 'string', next: '@doubleQuoteString' }],
            [/"/, { token: 'string', next: '@doubleQuoteString' }]
        ],
        singleQuoteString: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string'],
            [/''/, 'string'],
            [/'/, { token: 'string', next: '@pop' }]
        ],
        doubleQuoteString: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string'],
            [/""/, 'string'],
            [/"/, { token: 'string', next: '@pop' }]
        ],
        delimitedIdentifier: [[/`/, { token: 'identifier.delimited', next: '@backtickedIdentifier' }]],
        backtickedIdentifier: [
            [/[^`]+/, 'identifier.delimited'],
            [/``/, 'identifier.delimited'],
            [/`/, { token: 'identifier.delimited', next: '@pop' }]
        ]
    }
} as monaco.languages.IMonarchLanguage
