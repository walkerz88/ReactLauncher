import type { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import MDEditor, { commands } from '@uiw/react-md-editor/nohighlight';

import './MarkdownEditor.css';

export interface MarkdownEditorProps {
  value: string;
  height?: number;
  onChange: (value: string) => void;
}

const TOOLBAR = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  commands.divider,
  commands.title2,
  commands.title3,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.quote,
  commands.link,
  commands.hr,
  commands.table,
];

const MODES = [commands.codeEdit, commands.codePreview];

/** Markdown source editor with a formatting toolbar and a preview that renders exactly like the app page does. */
export const MarkdownEditor: FC<MarkdownEditorProps> = ({ value, height = 220, onChange }) => {
  return (
    <div className="markdown-editor" data-id="MarkdownEditor">
      <MDEditor
        value={value}
        height={height}
        commands={TOOLBAR}
        extraCommands={MODES}
        preview="edit"
        visibleDragbar={false}
        components={{
          preview: (source) => (
            <div className="markdown-editor__preview instructions-modal__text">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{source}</ReactMarkdown>
            </div>
          ),
        }}
        onChange={(next) => onChange(next ?? '')}
      />
    </div>
  );
};
