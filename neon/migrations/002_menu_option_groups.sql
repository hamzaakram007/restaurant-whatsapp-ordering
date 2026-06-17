-- Migrate menu_items from modifiers[] to option_groups jsonb
alter table menu_items add column if not exists option_groups jsonb not null default '[]';

update menu_items
set option_groups = case
  when coalesce(array_length(modifiers, 1), 0) > 0 then
    jsonb_build_array(
      jsonb_build_object(
        'id', 'legacy-options',
        'name', 'Options',
        'required', false,
        'choices', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'id', lower(replace(mod, ' ', '-')),
              'label', mod,
              'priceDeltaCents', 0
            )
          ), '[]'::jsonb)
          from unnest(modifiers) as mod
        )
      )
    )
  else '[]'::jsonb
end
where option_groups = '[]'::jsonb
  and exists (
    select 1 from information_schema.columns
    where table_name = 'menu_items' and column_name = 'modifiers'
  );

alter table menu_items drop column if exists modifiers;

alter table conversations add column if not exists context jsonb not null default '{}';

alter table order_items add column if not exists selected_options jsonb not null default '[]';
