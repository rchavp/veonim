import WorkspaceConfiguration from '../vscode/workspace-configuration'
import TextDocument from '../vscode/text-document'
import nvimSync from '../neovim/sync-api-client'
import { Watcher } from '../support/utils'
import { URI } from '../vscode/uri'
import Tasks from '../vscode/tasks'
import nvim from '../neovim/api'
import { basename } from 'path'
import * as vsc from 'vscode'

interface Events {
  didChangeWorkspaceFolders: vsc.WorkspaceFoldersChangeEvent
  didOpenTextDocument: vsc.TextDocument
  didCloseTextDocument: vsc.TextDocument
  didChangeTextDocument: vsc.TextDocumentChangeEvent
  willSaveTextDocument: vsc.TextDocumentWillSaveEvent
  didSaveTextDocument: vsc.TextDocument
  didChangeConfiguration: vsc.ConfigurationChangeEvent
}

const events = Watcher<Events>()

nvim.watchState.cwd((cwd, previousCwd) => events.emit('didChangeWorkspaceFolders', {
  added: [ WorkspaceFolder(cwd) ],
  removed: [ WorkspaceFolder(previousCwd) ],
}))

const workspace: typeof vsc.workspace = {
// const workspace: any = {
  get rootPath() { return nvim.state.cwd },
  get workspaceFolders() { return [ WorkspaceFolder(nvim.state.cwd) ] },
  get name() { return basename(nvim.state.cwd) },
  get textDocuments() {
    const buffers = nvimSync(nvim => nvim.buffers.list()).call()
    const bufferIds = buffers.map(b => b.id)
    return bufferIds.map(id => TextDocument(id))
  },
  // TODO: i'm not sure what the resource is used for?
  getConfiguration: (section, resource) => {
    if (resource) console.warn('NYI: workspace.getConfiguration - resource param not used:', resource)
    return WorkspaceConfiguration(section)
  },
  registerTaskProvider: (...a: any[]) => {
    console.warn('DEPRECATED: workspace.registerTaskProvider. use the "tasks" namespace instead')
    // @ts-ignore - help me typescript you're my only hope
    return Tasks.registerTaskProvider(...a as any)
  },
  registerFileSystemProvider: () => {
    console.warn('NYI: workspace.registerFileSystemProvider')
    return ({ dispose: () => {} })
  },
  onDidChangeWorkspaceFolders: fn => registerEvent('didChangeWorkspaceFolders', fn),
  onDidOpenTextDocument: fn => registerEvent('didOpenTextDocument', fn),
  onDidCloseTextDocument: fn => registerEvent('didCloseTextDocument', fn),
  onDidChangeTextDocument: fn => registerEvent('didChangeTextDocument', fn),
  onWillSaveTextDocument: fn => registerEvent('willSaveTextDocument', fn),
  onDidSaveTextDocument: fn => registerEvent('didSaveTextDocument', fn),
  onDidChangeConfiguration: fn => registerEvent('didChangeConfiguration', fn),
}

const registerEvent = (name: keyof Events, fn: any) => ({ dispose: events.on(name, fn) })

const WorkspaceFolder = (dir: string) => ({
  uri: URI.file(dir),
  name: basename(dir),
  index: 1,
})

export default workspace
