/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment';
import { dateFormat } from '../../common/constants/notebooks';

export const formatTimeGap = (milliseconds: number) => {
  if (milliseconds < 0) {
    return 'Invalid input: negative time';
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${
      minutes % 60 !== 1 ? 's' : ''
    }`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds % 60} second${
      seconds % 60 !== 1 ? 's' : ''
    }`;
  } else if (seconds > 0) {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  } else {
    return `${milliseconds} millisecond${milliseconds !== 1 ? 's' : ''}`;
  }
};

export const getTimeGapFromDates = (startDate: moment.Moment, endDate: moment.Moment) => {
  const duration = moment.duration(moment(endDate).diff(moment(startDate)));
  return formatTimeGap(duration.asMilliseconds());
};

export const PPL_TIME_FILTER_REGEX = /\s*\|\s*WHERE\s+`[^`]+`\s*>=?\s*'[^']+'\s*AND\s*`[^`]+`\s*<=?\s*'[^']+'/i;

export const getPPLQueryWithTimeRange = (
  query: string = '',
  from: number | string,
  to: number | string,
  timeField: string
) => {
  const startTime = typeof from === 'string' ? from : moment.utc(from).format(dateFormat);
  const endTime = typeof to === 'string' ? to : moment.utc(to).format(dateFormat);

  const whereCommand = timeField
    ? `WHERE \`${timeField}\` >= '${startTime}' AND \`${timeField}\` <= '${endTime}'`
    : '';

  // Append time filter where command after the first command
  const commands = query.split('|');
  commands.splice(1, 0, whereCommand);
  return commands.map((cmd) => cmd.trim()).join(' | ');
};
