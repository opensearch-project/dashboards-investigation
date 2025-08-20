/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  OpenSearchPPLLexer,
  OpenSearchPPLParser,
  OpenSearchPPLParserVisitor,
} from '@osd/antlr-grammar';
import { EvalFunctionCallContext } from '@osd/antlr-grammar/target/opensearch_ppl/.generated/OpenSearchPPLParser';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import moment from 'moment';

export interface ParsedPPLQuery {
  pplWithAbsoluteTime: string;
}

// ParseTreeListener
class PPLQueryParserVisitor extends OpenSearchPPLParserVisitor<void> {
  public result: ParsedPPLQuery = {
    pplWithAbsoluteTime: '',
  };

  public relativeTimeReplacements: Array<{ start: number; stop: number; replacement: string }> = [];

  visitEvalFunctionCall = (ctx: EvalFunctionCallContext) => {
    if (!ctx.start || !ctx.stop) return;
    const dateFnCtx = ctx.evalFunctionName().dateTimeFunctionName();

    if (!dateFnCtx) {
      ctx.children?.forEach((child) => {
        child.accept(this);
      });
      return;
    }

    const usingRelativeTime =
      dateFnCtx.NOW() ||
      dateFnCtx.CURDATE() ||
      dateFnCtx.CURRENT_DATE() ||
      dateFnCtx.CURRENT_TIME() ||
      dateFnCtx.CURRENT_TIMESTAMP();

    if (!usingRelativeTime) {
      ctx.children?.forEach((child) => {
        child.accept(this);
      });
      return;
    }

    const funcName = dateFnCtx.getText().toLowerCase();

    const now = moment(new Date()).utc();
    const formattedDate = now.format('YYYY-MM-DD HH:mm:ss');
    const formattedDateOnly = now.format('YYYY-MM-DD');
    const formattedTimeOnly = now.format('HH:mm:ss');

    const replacements: { [key: string]: string } = {
      now: `'${formattedDate}'`,
      curdate: `'${formattedDateOnly}'`,
      current_date: `'${formattedDateOnly}'`,
      current_time: `'${formattedTimeOnly}'`,
      current_timestamp: `'${formattedDate}'`,
    };

    if (replacements[funcName]) {
      this.relativeTimeReplacements.push({
        start: ctx.start.start,
        stop: ctx.stop.stop,
        replacement: replacements[funcName],
      });
    }
  };
}

export function parsePPLQuery(query: string): ParsedPPLQuery {
  const inputStream = CharStream.fromString(query);
  const lexer = new OpenSearchPPLLexer(inputStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new OpenSearchPPLParser(tokenStream);
  const tree = parser.root();

  const listener = new PPLQueryParserVisitor();
  tree.accept(listener);

  // Apply replacements from end to start to maintain positions
  const sortedReplacements = listener.relativeTimeReplacements.sort((a, b) => a.start - b.start);
  let result = '';
  let lastIndex = 0;
  for (const { start, stop, replacement } of sortedReplacements) {
    result += query.substring(lastIndex, start) + replacement;
    lastIndex = stop + 1;
  }
  result += query.substring(lastIndex);

  listener.result.pplWithAbsoluteTime = result;
  return listener.result;
}
