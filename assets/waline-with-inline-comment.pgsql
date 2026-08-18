-- Run this migration after the standard assets/waline.pgsql schema.
-- The table is separate from wl_comment to keep upstream Waline upgrades small.

CREATE SEQUENCE IF NOT EXISTS wl_annotation_seq;

CREATE TABLE IF NOT EXISTS wl_annotation (
  id int check (id > 0) NOT NULL DEFAULT NEXTVAL ('wl_annotation_seq'),
  comment_id int NOT NULL,
  url varchar(255) NOT NULL,
  selector jsonb NOT NULL,
  article_fingerprint char(64) DEFAULT NULL,
  annotation_type varchar(32) NOT NULL DEFAULT 'thought',
  createdAt timestamp(0) without time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp(0) without time zone NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT wl_annotation_comment_unique UNIQUE (comment_id),
  CONSTRAINT wl_annotation_comment_fk
    FOREIGN KEY (comment_id) REFERENCES wl_comment (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS wl_annotation_url_idx ON wl_annotation (url);
