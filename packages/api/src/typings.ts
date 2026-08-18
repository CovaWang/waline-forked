export type WalineCommentStatus = 'approved' | 'waiting' | 'spam';

export type WalineUserType = 'administrator' | 'guest';

export interface WalineTextQuoteSelector {
  /** Selected text */
  exact: string;

  /** Text immediately before the selection */
  prefix: string;

  /** Text immediately after the selection */
  suffix: string;
}

export interface WalineTextPositionSelector {
  /** Selection start in the article text content */
  start: number;

  /** Selection end in the article text content */
  end: number;
}

export interface WalineDomRangeSelector {
  /** Child-node path from the article root to the start container */
  startPath: number[];

  /** Offset inside the start container */
  startOffset: number;

  /** Child-node path from the article root to the end container */
  endPath: number[];

  /** Offset inside the end container */
  endOffset: number;
}

export interface WalineTextAnchor {
  quote: WalineTextQuoteSelector;
  position: WalineTextPositionSelector;
  range?: WalineDomRangeSelector;
}

export interface WalineInlineAnnotationInput {
  selector: WalineTextAnchor;
  articleFingerprint?: string;
  annotationType?: 'thought';
}

export interface WalineInlineAnnotation extends WalineInlineAnnotationInput {
  objectId: number;
  commentId: number;
  url: string;
}

export interface WalineCommentData {
  /** User Nickname */
  nick: string;

  /** User email */
  mail?: string;

  /** User link */
  link?: string;

  /** Content of comment */
  comment: string;

  /** User Agent */
  ua: string;

  /** Comment page path */
  // FIXME: Rename it to `path`
  url: string;

  /**
   * Parent comment id
   *
   * Only available when replying comment
   */

  pid?: number;

  /**
   * Root comment id
   *
   * Only available when replying comment
   */
  rid?: number;

  /**
   * User id being at
   *
   * Only available when replying comment
   */
  at?: string;

  /** Recaptcha Token */
  // FIXME: Rename it to `verifyToken`
  recaptchaV3?: string;

  /** Turnstile Token */
  turnstile?: string;

  /** Text anchor for a thought attached to article content */
  annotation?: WalineInlineAnnotationInput;
}

export interface BaseWalineResponseComment {
  /** Comment object ID */
  objectId: number;

  /** Timestamp of the comment */
  time: number;

  /** Content of comment */
  comment: string;

  /**
   * Original comment content
   *
   * 原始评论内容
   */
  orig: string;

  /**
   * Comment like number
   *
   * 评论喜欢数
   */
  like: number;

  /** User Nickname */
  nick: string;

  /** User link */
  link: string;

  /** User avatar */
  avatar: string;

  /**
   * User type
   *
   * Only available with logged in user 用户类型
   *
   * 仅在登录用户时可用
   */
  type?: WalineUserType;

  /**
   * User ID
   *
   * Only available with logged in user 用户 ID
   *
   * 仅在登录用户时可用
   */
  // FIXME: Rename it to `userId`
  user_id?: number;

  /**
   * User location
   *
   * Not available with `DISABLE_REGION=true` 用户位置
   *
   * `DISABLE_REGION=true` 时不可用
   */
  addr?: string;

  /**
   * User browser
   *
   * Not available with `DISABLE_USERAGENT=true` 用户浏览器
   *
   * `DISABLE_USERAGENT=true` 时不可用
   */
  browser?: string;

  /**
   * User location
   *
   * Not available with `DISABLE_USERAGENT=true` 用户位置
   *
   * `DISABLE_USERAGENT=true` 时不可用
   */
  os?: string;

  /**
   * User level
   *
   * Only available when `LEVELS` is set 用户等级
   *
   * 仅在 `LEVELS` 设置时可用
   */
  level?: number;

  /**
   * User label
   *
   * 用户标签
   */
  label?: string;

  /**
   * Comment status
   *
   * For administrators, `approved` `spam` `waiting` can be get, for others, the only value is
   * `approved` 评论状态
   *
   * 管理员可获得 `approved`、`spam` 和 `waiting`，其他用户只能获得 `approved`
   */
  status?: WalineCommentStatus;

  /** Inline thought metadata, when this comment is anchored to article text */
  annotation?: WalineInlineAnnotation;
}

export interface WalineChildComment extends BaseWalineResponseComment {
  /** Parent comment id */

  pid: number;

  /** Root comment id */
  rid: number;

  /** User id being at */
  at?: string;

  /** Reply user information */
  reply_user?: {
    nick: string;
    link: string;
    avatar: string;
  };
}

export interface WalineRootComment extends BaseWalineResponseComment {
  /**
   * Whether the comment is sticky
   *
   * 是否置顶
   */
  sticky: boolean;

  /**
   * Child comments
   *
   * 子评论
   */
  children: WalineChildComment[];
}

export type WalineComment = WalineRootComment | WalineChildComment;
