-- 0002_views.sql — the analytics views of docs/08-database.md "Views for analytics (3u, 2b)".
--
-- Views, not materialised views: the doc specifies `create view`, and every one of them reads
-- tables the match writes to, so a stale snapshot would show a board's own author numbers that
-- disagree with the match they just played.

create view v_board_traffic as
select bv.id as board_version_id, date(m.created_at) as day, count(*) as matches
from matches m join board_versions bv on bv.id = m.board_version_id
group by 1, 2;

create view v_board_tile_heat as
select m.board_version_id, e.tile_index, count(*) as landings
from match_events e join matches m on m.id = e.match_id
where e.type = 'landed'
group by 1, 2;

create view v_board_seat_winrate as
select m.board_version_id, p.seat,
       avg(case when m.winner_player_id = p.player_id then 1.0 else 0.0 end) as win_rate,
       count(*) as matches
from matches m join match_players p on p.match_id = m.id
where m.ended_at is not null
group by 1, 2;

create view v_board_endings as
select board_version_id, end_reason, count(*) as matches,
       percentile_cont(0.5) within group (order by extract(epoch from (ended_at - started_at)) / 60) as median_minutes
from matches where ended_at is not null
group by 1, 2;

-- down

drop view if exists v_board_endings;
drop view if exists v_board_seat_winrate;
drop view if exists v_board_tile_heat;
drop view if exists v_board_traffic;
