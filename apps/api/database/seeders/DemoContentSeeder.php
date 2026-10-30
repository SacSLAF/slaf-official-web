<?php

namespace Database\Seeders;

use App\Enums\ContentStatus;
use App\Models\Aircraft;
use App\Models\Base;
use App\Models\ContentModel;
use App\Models\Event;
use App\Models\News;
use App\Models\Page;
use App\Models\Tender;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * SAMPLE content for local development and design review only.
 *
 * News items, events and tenders here are illustrative placeholders, not
 * real announcements. Sinhala and Tamil strings must be reviewed by the
 * Media Directorate's translators before any of this is reused.
 */
class DemoContentSeeder extends Seeder
{
    private User $editor;

    private User $approver;

    public function run(): void
    {
        // Safe to re-run (the Docker dev entrypoint seeds on every start): only seeds an empty site.
        if (News::withTrashed()->exists()) {
            return;
        }

        $this->editor = User::where('email', 'editor@slaf.test')->firstOrFail();
        $this->approver = User::where('email', 'approver@slaf.test')->firstOrFail();

        $this->bases();
        $this->aircraft();
        $this->pages();
        $this->news();
        $this->events();
        $this->tenders();
    }

    private function bases(): void
    {
        $bases = [
            ['air-force-headquarters', 'headquarters', 'western', 6.9187, 79.8508, 1951, ['Air Force Headquarters', 'ගුවන් හමුදා මූලස්ථානය', 'விமானப்படைத் தலைமையகம்'], 'Command and administrative headquarters of the Sri Lanka Air Force, Colombo.'],
            ['slaf-katunayake', 'base', 'western', 7.1708, 79.8836, null, ['SLAF Katunayake', 'ගුවන් හමුදා කටුනායක කඳවුර', 'விமானப்படைத் தளம் கட்டுநாயக்க'], 'The largest air base of the SLAF, co-located with Bandaranaike International Airport.'],
            ['slaf-ratmalana', 'base', 'western', 6.8219, 79.8862, null, ['SLAF Ratmalana', 'ගුවන් හමුදා රත්මලාන කඳවුර', 'விமானப்படைத் தளம் இரத்மலானை'], 'Historic air base south of Colombo, home to transport and training activities.'],
            ['slaf-china-bay', 'academy', 'eastern', 8.5385, 81.1819, null, ['SLAF Academy China Bay', 'ගුවන් හමුදා ඇකඩමිය චීන වරාය', 'விமானப்படைக் கல்விக்கழகம் சீனக்குடா'], 'The SLAF Academy, where officer cadets and aircrew undergo their training.'],
            ['slaf-hingurakgoda', 'base', 'north_central', 8.0373, 80.9814, null, ['SLAF Hingurakgoda', 'ගුවන් හමුදා හිඟුරක්ගොඩ කඳවුර', 'விமானப்படைத் தளம் ஹிங்குராக்கொட'], 'Air base in the North Central Province supporting rotary-wing operations.'],
            ['slaf-anuradhapura', 'base', 'north_central', 8.3016, 80.4279, null, ['SLAF Anuradhapura', 'ගුවන් හමුදා අනුරාධපුර කඳවුර', 'விமானப்படைத் தளம் அனுராதபுரம்'], 'Air base serving the North Central Province.'],
            ['slaf-vavuniya', 'base', 'northern', 8.7414, 80.4973, null, ['SLAF Vavuniya', 'ගුවන් හමුදා වවුනියාව කඳවුර', 'விமானப்படைத் தளம் வவுனியா'], 'Air base in the Northern Province.'],
            ['slaf-palaly', 'station', 'northern', 9.7923, 80.0701, null, ['SLAF Palaly', 'ගුවන් හමුදා පලාලි ස්ථානය', 'விமானப்படை நிலையம் பலாலி'], 'Air Force station on the Jaffna peninsula.'],
            ['slaf-koggala', 'station', 'southern', 5.9937, 80.3203, null, ['SLAF Koggala', 'ගුවන් හමුදා කොග්ගල ස්ථානය', 'விமானப்படை நிலையம் கொக்கலை'], 'Air Force station on the southern coast.'],
            ['slaf-ampara', 'station', 'eastern', 7.2930, 81.6255, null, ['SLAF Ampara', 'ගුවන් හමුදා අම්පාර ස්ථානය', 'விமானப்படை நிலையம் அம்பாறை'], 'Air Force station in the Eastern Province.'],
        ];

        foreach ($bases as $i => [$slug, $type, $province, $lat, $lng, $year, $names, $summary]) {
            $this->publish(new Base, [
                'slug' => $slug,
                'name' => ['en' => $names[0], 'si' => $names[1], 'ta' => $names[2]],
                'summary' => ['en' => $summary],
                'body' => ['en' => "<p>{$summary}</p><p>Detailed unit information is maintained by the base establishment officer.</p>"],
                'base_type' => $type,
                'province' => $province,
                'latitude' => $lat,
                'longitude' => $lng,
                'established_year' => $year,
                'sort_order' => $i,
            ]);
        }
    }

    private function aircraft(): void
    {
        $fleet = [
            ['kfir', 'fighter', 'Israel Aerospace Industries', 'Israel', ['IAI Kfir', 'IAI ක්ෆීර්', 'IAI கஃபிர்'], 'Multi-role supersonic fighter and ground-attack aircraft.'],
            ['mi-17', 'helicopter', 'Mil Moscow Helicopter Plant', 'Russia', ['Mi-17', 'Mi-17', 'Mi-17'], 'Medium twin-turbine transport helicopter, the workhorse of humanitarian and disaster-relief missions.'],
            ['bell-412', 'helicopter', 'Bell Textron', 'United States', ['Bell 412', 'බෙල් 412', 'பெல் 412'], 'Utility helicopter used for VIP transport, casualty evacuation and search and rescue.'],
            ['c-130-hercules', 'transport', 'Lockheed Martin', 'United States', ['C-130 Hercules', 'C-130 හර්කියුලිස්', 'C-130 ஹெர்குலிஸ்'], 'Four-engine tactical airlifter for troops, cargo and relief supplies.'],
            ['y-12', 'transport', 'Harbin Aircraft Industry Group', 'China', ['Harbin Y-12', 'හාබින් Y-12', 'ஹார்பின் Y-12'], 'Light utility transport aircraft with short take-off capability.'],
            ['k-8', 'trainer', 'Hongdu Aviation Industry', 'China', ['K-8 Karakorum', 'K-8 කැරකෝරම්', 'K-8 கரகோரம்'], 'Intermediate jet trainer and light attack aircraft.'],
            ['king-air', 'surveillance', 'Textron Aviation', 'United States', ['Beechcraft King Air', 'බීච්ක්‍රාෆ්ට් කිං එයාර්', 'பீச்கிராஃப்ட் கிங் ஏர்'], 'Twin-turboprop platform configured for maritime surveillance.'],
        ];

        foreach ($fleet as $i => [$slug, $role, $maker, $origin, $names, $summary]) {
            $this->publish(new Aircraft, [
                'slug' => $slug,
                'name' => ['en' => $names[0], 'si' => $names[1], 'ta' => $names[2]],
                'summary' => ['en' => $summary],
                'body' => ['en' => "<p>{$summary}</p>"],
                'role' => $role,
                'manufacturer' => $maker,
                'origin_country' => $origin,
                'sort_order' => $i,
            ]);
        }
    }

    private function pages(): void
    {
        $this->publish(new Page, [
            'slug' => 'about',
            'section' => 'about',
            'title' => ['en' => 'About the Sri Lanka Air Force', 'si' => 'ශ්‍රී ලංකා ගුවන් හමුදාව ගැන', 'ta' => 'இலங்கை விமானப்படை பற்றி'],
            'summary' => [
                'en' => 'Guardians of the skies — safeguarding the sovereignty of Sri Lanka and serving the nation in times of need.',
                'si' => 'අහසේ ආරක්ෂකයෝ — ශ්‍රී ලංකාවේ ස්වෛරීත්වය සුරකිමින්, අවශ්‍ය සෑම විටම ජාතියට සේවය කරමු.',
                'ta' => 'வானின் காவலர்கள் — இலங்கையின் இறையாண்மையைப் பாதுகாத்து, தேவையான நேரங்களில் தேசத்திற்குச் சேவை செய்கிறோம்.',
            ],
            'body' => ['en' => '<p>The Sri Lanka Air Force (SLAF) is the air arm of the Sri Lanka Armed Forces. Its mission is to defend the airspace of Sri Lanka, support the other services, and assist civil authorities during national emergencies and humanitarian operations.</p>'],
            'sort_order' => 0,
        ]);

        $this->publish(new Page, [
            'slug' => 'history',
            'section' => 'history',
            'title' => ['en' => 'Our History', 'si' => 'අපගේ ඉතිහාසය', 'ta' => 'எமது வரலாறு'],
            'summary' => ['en' => 'From the Royal Ceylon Air Force of 1951 to a modern, multi-role air arm marking its 75th anniversary in 2026.'],
            'body' => ['en' => '<p>The Royal Ceylon Air Force was formed on 2 March 1951 and became the Sri Lanka Air Force in 1972. In 2026 the SLAF marks 75 years of service to the nation.</p>'],
            'sort_order' => 1,
        ]);

        $this->publish(new Page, [
            'slug' => 'command-structure',
            'section' => 'command',
            'title' => ['en' => 'Command Structure', 'si' => 'අණදීමේ ව්‍යුහය', 'ta' => 'கட்டளைக் கட்டமைப்பு'],
            'summary' => ['en' => 'How the SLAF is organised, from Air Force Headquarters to its bases, stations and squadrons.'],
            'body' => ['en' => '<p>The Commander of the Air Force exercises command through Air Force Headquarters and its directorates, which oversee operations, engineering, logistics, administration and training across all bases and stations.</p>'],
            'sort_order' => 2,
        ]);

        $this->publish(new Page, [
            'slug' => 'careers',
            'section' => 'careers',
            'title' => ['en' => 'Careers in the Air Force', 'si' => 'ගුවන් හමුදාවේ වෘත්තීන්', 'ta' => 'விமானப்படையில் தொழில் வாய்ப்புகள்'],
            'summary' => ['en' => 'Officer, airman and airwoman, and civilian career paths in flying, engineering, logistics and support branches.'],
            'body' => ['en' => '<p>Recruitment notices are published in the News section and in national newspapers. Check eligibility requirements carefully before applying.</p>'],
            'sort_order' => 3,
        ]);
    }

    private function news(): void
    {
        $katunayake = Base::where('slug', 'slaf-katunayake')->value('id');

        $items = [
            ['slaf-75th-anniversary-celebrations', 'feature', true, 2, [
                'en' => 'Sri Lanka Air Force marks its 75th anniversary',
                'si' => 'ශ්‍රී ලංකා ගුවන් හමුදාව 75 වන සංවත්සරය සමරයි',
                'ta' => 'இலங்கை விமானப்படை தனது 75வது ஆண்டு நிறைவைக் கொண்டாடுகிறது',
            ], [
                'en' => 'Seventy-five years of service to the nation were commemorated with a ceremonial parade and fly-past.',
                'si' => 'ජාතියට කළ වසර හැත්තෑපහක සේවය උත්සවාකාර පෙළපාලියකින් සහ ගුවන් ප්‍රදර්ශනයකින් සමරනු ලැබීය.',
                'ta' => 'தேசத்திற்கான எழுபத்தைந்து ஆண்டு சேவை சடங்கு அணிவகுப்பு மற்றும் வான் சாகசத்துடன் நினைவுகூரப்பட்டது.',
            ]],
            ['flood-relief-northern-districts', 'humanitarian', true, 5, [
                'en' => 'Mi-17 crews deliver flood relief to Northern districts',
                'si' => 'Mi-17 කාර්ය මණ්ඩල උතුරු දිස්ත්‍රික්කවලට ගංවතුර සහන ලබා දෙයි',
                'ta' => 'Mi-17 குழுவினர் வடக்கு மாவட்டங்களுக்கு வெள்ள நிவாரணம் வழங்கினர்',
            ], [
                'en' => 'Helicopter crews flew multiple sorties to deliver dry rations and evacuate stranded residents.',
                'si' => 'හෙලිකොප්ටර් කාර්ය මණ්ඩල වියළි ආහාර ලබා දීමට සහ සිරවී සිටි පදිංචිකරුවන් ඉවත් කිරීමට ගුවන් ගමන් කිහිපයක් සිදු කළහ.',
                'ta' => 'உலர் உணவுப் பொருட்களை வழங்கவும் சிக்கித் தவித்த மக்களை வெளியேற்றவும் ஹெலிகாப்டர் குழுவினர் பல பறப்புகளை மேற்கொண்டனர்.',
            ]],
            ['officer-cadet-intake-applications', 'press_release', true, 8, [
                'en' => 'Applications invited for the Officer Cadet intake',
                'si' => 'නිලධාරී ශිෂ්‍ය භට බඳවා ගැනීම සඳහා අයදුම්පත් කැඳවේ',
                'ta' => 'அதிகாரி பயிலுநர் சேர்க்கைக்கு விண்ணப்பங்கள் கோரப்படுகின்றன',
            ], [
                'en' => 'Eligible young Sri Lankans are invited to apply for commissioned service in flying and ground branches.',
                'si' => 'සුදුසුකම් ලත් තරුණ ශ්‍රී ලාංකිකයින්ට ගුවන් සහ භූමි අංශවල නිලධාරී සේවය සඳහා අයදුම් කිරීමට ආරාධනා කෙරේ.',
                'ta' => 'தகுதியுள்ள இளம் இலங்கையர்கள் பறப்பு மற்றும் தரைப் பிரிவுகளில் அதிகாரி சேவைக்கு விண்ணப்பிக்க அழைக்கப்படுகின்றனர்.',
            ]],
            ['academy-graduation-parade', 'news', false, 12, [
                'en' => 'Graduation parade held at the SLAF Academy, China Bay',
                'si' => 'චීන වරාය ගුවන් හමුදා ඇකඩමියේ උපාධි ප්‍රදාන පෙළපාලිය පැවැත්විණි',
                'ta' => 'சீனக்குடா விமானப்படைக் கல்விக்கழகத்தில் பட்டமளிப்பு அணிவகுப்பு நடைபெற்றது',
            ], [
                'en' => 'Newly commissioned officers passed out after completing their training at the Academy.',
            ]],
            ['southern-coast-beach-cleanup', 'news', false, 16, [
                'en' => 'Airmen join beach clean-up campaign along the southern coast',
            ], [
                'en' => 'Personnel from SLAF Koggala joined local communities to clear plastic waste from the shoreline.',
            ]],
            ['inter-unit-athletics-championship', 'sports', false, 21, [
                'en' => 'Inter-unit athletics championship concludes',
                'si' => 'අන්තර් ඒකක මලල ක්‍රීඩා ශූරතාවලිය අවසන් වේ',
            ], [
                'en' => 'Athletes from bases across the island competed over three days of track and field events.',
            ]],
        ];

        foreach ($items as [$slug, $category, $featured, $daysAgo, $title, $summary]) {
            $this->publish(new News, [
                'slug' => $slug,
                'category' => $category,
                'is_featured' => $featured,
                'title' => $title,
                'summary' => $summary,
                'body' => ['en' => '<p>'.$summary['en'].'</p><p>This is sample content for development and design review.</p>'],
                'base_id' => $slug === 'flood-relief-northern-districts' ? null : $katunayake,
            ], now()->subDays($daysAgo));
        }

        // Unpublished items so the review queue and workflow are visible in the admin panel.
        $pending = $this->draft(new News, [
            'slug' => 'new-search-and-rescue-coordination-centre',
            'category' => 'news',
            'title' => ['en' => 'New search and rescue coordination centre opened'],
            'summary' => ['en' => 'The centre will coordinate air search and rescue across Sri Lanka’s maritime region.'],
            'body' => ['en' => '<p>Sample draft awaiting review.</p>'],
        ]);
        $pending->forceFill(['status' => ContentStatus::InReview, 'submitted_by' => $this->editor->id, 'submitted_at' => now()->subHours(3)])->saveQuietly();
        $pending->recordRevision('submit', $this->editor);

        $this->draft(new News, [
            'slug' => 'aviation-medicine-symposium',
            'category' => 'news',
            'title' => ['en' => 'Aviation medicine symposium (draft)'],
            'summary' => ['en' => 'Draft article still being written.'],
        ]);
    }

    private function events(): void
    {
        $events = [
            ['recruitment-open-day-ratmalana', 20, 'Recruitment open day', 'SLAF Ratmalana', 'Meet serving personnel and learn about careers in the Air Force.'],
            ['air-force-day-2027', 123, 'Air Force Day 2027', 'Air Force Headquarters, Colombo', 'Annual commemoration of the founding of the Air Force.'],
            ['blood-donation-campaign', 9, 'Blood donation campaign', 'SLAF Katunayake', 'Open to personnel, families and the public.'],
        ];

        foreach ($events as [$slug, $days, $title, $venue, $summary]) {
            $this->publish(new Event, [
                'slug' => $slug,
                'title' => ['en' => $title],
                'venue' => ['en' => $venue],
                'summary' => ['en' => $summary],
                'starts_at' => now()->addDays($days)->setTime(9, 0),
                'ends_at' => now()->addDays($days)->setTime(16, 0),
            ]);
        }
    }

    private function tenders(): void
    {
        $tenders = [
            ['SLAF/PROC/GDS/2026/114', 'goods', 'ncb', 21, 'Supply of aviation ground support equipment', 'උපකරණ සැපයීම — ගුවන් භූමි සහාය උපකරණ', 'விமான தரை ஆதரவு உபகரணங்கள் வழங்கல்'],
            ['SLAF/PROC/WKS/2026/087', 'works', 'ncb', 30, 'Construction of an accommodation block at SLAF Hingurakgoda', 'ගුවන් හමුදා හිඟුරක්ගොඩ කඳවුරේ නවාතැන් ගොඩනැගිල්ලක් ඉදිකිරීම', 'விமானப்படைத் தளம் ஹிங்குராக்கொடவில் தங்குமிடக் கட்டடம் நிர்மாணித்தல்'],
            ['SLAF/PROC/SRV/2026/052', 'services', 'shopping', 10, 'Provision of janitorial services for Air Force Headquarters', null, null],
            ['SLAF/PROC/DSP/2026/019', 'disposal', 'ncb', -5, 'Disposal of unserviceable vehicles by public auction', null, null],
        ];

        foreach ($tenders as [$ref, $category, $method, $closesIn, $en, $si, $ta]) {
            $this->publish(new Tender, [
                'slug' => strtolower(str_replace('/', '-', $ref)),
                'reference_no' => $ref,
                'title' => array_filter(['en' => $en, 'si' => $si, 'ta' => $ta]),
                'summary' => ['en' => 'Sealed bids are invited from eligible bidders. Bidding documents may be downloaded below.'],
                'body' => ['en' => '<p>Bids must be submitted to the Secretary, SLAF Procurement Committee, before the closing time. Late bids will be rejected.</p>'],
                'category' => $category,
                'procurement_method' => $method,
                'opens_at' => now()->subDays(7)->setTime(9, 0),
                'closes_at' => now()->addDays($closesIn)->setTime(14, 0),
                'bid_security_lkr' => $category === 'works' ? 250000 : null,
                'tender_state' => 'open',
            ]);
        }

        // One sample bidding document, stored on the private disk.
        $tender = Tender::where('reference_no', 'SLAF/PROC/GDS/2026/114')->first();
        $pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
        $path = "tenders/{$tender->id}/sample-bidding-document.pdf";
        Storage::disk('local')->put($path, $pdf);
        $tender->documents()->create([
            'title' => ['en' => 'Bidding document (sample)', 'si' => 'ලංසු ලේඛනය', 'ta' => 'கேள்விப் பத்திரம்'],
            'path' => $path,
            'original_name' => 'SLAF-PROC-GDS-2026-114-bidding-document.pdf',
            'mime_type' => 'application/pdf',
            'size' => strlen($pdf),
            'sha256' => hash('sha256', $pdf),
            'uploaded_by' => $this->editor->id,
        ]);
    }

    private function publish(ContentModel $model, array $attributes, $publishedAt = null): ContentModel
    {
        $model->fill($attributes)->forceFill([
            'status' => ContentStatus::Published,
            'created_by' => $this->editor->id,
            'submitted_by' => $this->editor->id,
            'submitted_at' => ($publishedAt ?? now())->copy()->subHour(),
            'reviewed_by' => $this->approver->id,
            'reviewed_at' => $publishedAt ?? now(),
            'published_at' => $publishedAt ?? now()->subMinute(),
        ])->save();

        $model->recordRevision('approve', $this->approver);

        return $model;
    }

    private function draft(ContentModel $model, array $attributes): ContentModel
    {
        $model->fill($attributes)->forceFill([
            'status' => ContentStatus::Draft,
            'created_by' => $this->editor->id,
            'updated_by' => $this->editor->id,
        ])->save();

        $model->recordRevision('create', $this->editor);

        return $model;
    }
}
