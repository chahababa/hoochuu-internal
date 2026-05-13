-- Replace legacy place names embedded in inspection_items.name with the
-- canonical store designations (1店 / 2店 / 3店 / 4店). Older seed data shipped
-- items with names like "台北站前店自助區備品完整" — this migration brings
-- them in line with the rest of the system, where stores are referenced
-- only as "1店" through "4店".
update public.inspection_items
set name = case name
  when '台北站前店自助區備品完整' then '1店自助區備品完整'
  when '台北站前店尖峰支援安排到位' then '1店尖峰支援安排到位'
  when '板橋車站店外送交接架整齊' then '2店外送交接架整齊'
  when '桃園廣場店炸台備援工具齊全' then '3店炸台備援工具齊全'
  when '中壢樞紐店晚班清潔交接完整' then '4店晚班清潔交接完整'
  else name
end
where name in (
  '台北站前店自助區備品完整',
  '台北站前店尖峰支援安排到位',
  '板橋車站店外送交接架整齊',
  '桃園廣場店炸台備援工具齊全',
  '中壢樞紐店晚班清潔交接完整'
);
