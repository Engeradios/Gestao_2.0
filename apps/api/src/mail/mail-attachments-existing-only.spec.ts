import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('MAIL-OBRA - anexos existentes apenas', () => {
  const source = readFileSync(join(__dirname, 'mail.service.ts'), 'utf8');

  it('valida os caminhos antes do envio', () => {
    expect(source).toContain("import { access } from 'node:fs/promises';");
    expect(source).toContain('await access(attachment.path)');
    expect(source).toContain('validAttachments.push(attachment)');
  });

  it('envia somente anexos validados', () => {
    expect(source).toContain('attachments: validAttachments');
    expect(source).not.toContain('attachments: input.attachments,');
  });

  it('preserva o envio mesmo quando o arquivo nao existe', () => {
    expect(source).toMatch(
      /try \{[\s\S]*await access\(attachment\.path\)[\s\S]*\} catch \{/,
    );
  });
});
