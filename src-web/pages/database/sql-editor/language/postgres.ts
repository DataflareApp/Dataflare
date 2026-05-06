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
    operators: [],
    builtinFunctions: [],
    builtinVariables: [],
    pseudoColumns: [],
    tokenizer: {
        root: [
            { include: '@comments' },
            { include: '@whitespace' },
            { include: '@pseudoColumns' },
            { include: '@numbers' },
            { include: '@strings' },
            { include: '@complexIdentifiers' },
            { include: '@scopes' },
            [/[;,.]/, 'delimiter'],
            [/[()]/, '@brackets'],
            [
                /[\w@#$]+/,
                {
                    cases: {
                        '@operators': 'operator',
                        '@builtinVariables': 'predefined',
                        '@builtinFunctions': 'predefined',
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }
            ],
            [/[<>=!%&+\-*/|~^]/, 'operator']
        ],
        whitespace: [[/\s+/, 'white']],
        comments: [
            [/--+.*/, 'comment'],
            [/\/\*/, { token: 'comment.quote', next: '@comment' }]
        ],
        comment: [
            [/[^*/]+/, 'comment'],
            [/\*\//, { token: 'comment.quote', next: '@pop' }],
            [/./, 'comment']
        ],
        pseudoColumns: [
            [
                /[$][A-Za-z_][\w@#$]*/,
                {
                    cases: {
                        '@pseudoColumns': 'predefined',
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        numbers: [
            [/0[xX][0-9a-fA-F]*/, 'number'],
            [/[$][+-]*\d*(\.\d*)?/, 'number'],
            [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, 'number']
        ],
        strings: [[/'/, { token: 'string', next: '@string' }]],
        string: [
            [/[^']+/, 'string'],
            [/''/, 'string'],
            [/'/, { token: 'string', next: '@pop' }]
        ],
        complexIdentifiers: [[/"/, { token: 'identifier.quote', next: '@quotedIdentifier' }]],
        quotedIdentifier: [
            [/[^"]+/, 'identifier'],
            [/""/, 'identifier'],
            [/"/, { token: 'identifier.quote', next: '@pop' }]
        ],
        scopes: []
    }
} as monaco.languages.IMonarchLanguage
