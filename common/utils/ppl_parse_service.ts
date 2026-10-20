/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  OpenSearchPPLLexer,
  OpenSearchPPLParser,
  OpenSearchPPLParserVisitor,
} from '@osd/antlr-grammar';
import {
  CompareExprContext,
  EvalFunctionCallContext,
  FromClauseContext,
} from '@osd/antlr-grammar/target/opensearch_ppl/.generated/OpenSearchPPLParser';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import moment from 'moment';

export interface ParsedPPLQuery {
  pplWithAbsoluteTime: string;
  fromClause?: { start: number; stop: number; text: string };
  compareExprs?: Array<{ left: string; right: string; op: string }>;
}

// ParseTreeListener
class PPLQueryParserVisitor extends OpenSearchPPLParserVisitor<void> {
  private query: string;
  private now?: number;

  constructor(query: string, now?: number) {
    super();
    this.query = query;
    this.now = now;
  }

  public result: ParsedPPLQuery = {
    pplWithAbsoluteTime: '',
    compareExprs: [] as Array<{ left: string; right: string; op: string }>,
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

    let now = moment(new Date()).utc();
    if (this.now) {
      now = moment(this.now).utc();
    }
    const formattedDate = now.format('YYYY-MM-DD HH:mm:ss');
    const formattedDateOnly = now.format('YYYY-MM-DD');
    const formattedTimeOnly = now.format('HH:mm:ss');

    const replacements: { [key: string]: string } = {
      now: `timestamp('${formattedDate}')`,
      curdate: `'${formattedDateOnly}'`,
      current_date: `'${formattedDateOnly}'`,
      current_time: `'${formattedTimeOnly}'`,
      current_timestamp: `timestamp('${formattedDate}')`,
    };

    if (replacements[funcName]) {
      this.relativeTimeReplacements.push({
        start: ctx.start.start,
        stop: ctx.stop.stop,
        replacement: replacements[funcName],
      });
    }
  };

  visitFromClause = (ctx: FromClauseContext) => {
    if (!ctx.start || !ctx.stop) return;
    this.result.fromClause = {
      start: ctx.start.start,
      stop: ctx.stop.stop,
      text: this.query.substring(ctx.start.start, ctx.stop.stop + 1),
    };
  };

  visitCompareExpr = (ctx: CompareExprContext) => {
    const left = ctx._left;
    const right = ctx._right;
    const operator = ctx.comparisonOperator();
    if (
      (operator.LESS() || operator.NOT_LESS() || operator.GREATER() || operator.NOT_GREATER()) &&
      left?.start &&
      left.stop &&
      right?.start &&
      right.stop
    ) {
      this.result.compareExprs?.push({
        left: this.query.substring(left.start?.start, left.stop?.stop + 1),
        right: this.query.substring(right.start?.start, right.stop?.stop + 1),
        op: operator.getText(),
      });
    }

    ctx.children.forEach((child) => child.accept(this));
  };
}

export function parsePPLQuery(query: string, now?: number): ParsedPPLQuery {
  const inputStream = CharStream.fromString(query);
  const lexer = new OpenSearchPPLLexer(inputStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new OpenSearchPPLParser(tokenStream);
  const tree = parser.root();

  const listener = new PPLQueryParserVisitor(query, now);
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
