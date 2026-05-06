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
    tokenizer: {
        root: [
            { include: '@comments' },
            { include: '@whitespace' },
            { include: '@numbers' },
            { include: '@strings' },
            { include: '@complexIdentifiers' },
            { include: '@scopes' },
            [/[;,.]/, 'delimiter'],
            [/[()]/, '@brackets'],
            [
                /[\w@]+/,
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
            [/#+.*/, 'comment'],
            [/\/\*/, { token: 'comment.quote', next: '@comment' }]
        ],
        comment: [
            [/[^*/]+/, 'comment'],
            [/\*\//, { token: 'comment.quote', next: '@pop' }],
            [/./, 'comment']
        ],
        numbers: [
            [/0[xX][0-9a-fA-F]*/, 'number'],
            [/[$][+-]*\d*(\.\d*)?/, 'number'],
            [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, 'number']
        ],
        strings: [
            [/'/, { token: 'string', next: '@string' }],
            [/"/, { token: 'string.double', next: '@stringDouble' }]
        ],
        string: [
            [/\\'/, 'string'],
            [/[^']+/, 'string'],
            [/''/, 'string'],
            [/'/, { token: 'string', next: '@pop' }]
        ],
        stringDouble: [
            [/[^"]+/, 'string.double'],
            [/""/, 'string.double'],
            [/"/, { token: 'string.double', next: '@pop' }]
        ],
        complexIdentifiers: [[/`/, { token: 'identifier.quote', next: '@quotedIdentifier' }]],
        quotedIdentifier: [
            [/[^`]+/, 'identifier'],
            [/``/, 'identifier'],
            [/`/, { token: 'identifier.quote', next: '@pop' }]
        ],
        scopes: []
    }
} as monaco.languages.IMonarchLanguage
