import unittest
import sys
import os

# Add ai root to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.challenge import ChallengeInput
from app.services.dossier_engine import generate_challenge_dossier


class TestChallengeDossierEngineGeneralization(unittest.TestCase):

    def _assert_dossier_coherence(self, result, expected_subdomain):
        """Helper to assert full dossier coherence and strict schema rules."""
        dossier = result.dossier
        self.assertIsNotNone(result.domain)
        self.assertIsNotNone(result.subdomain)
        self.assertEqual(result.subdomain, expected_subdomain)
        self.assertTrue(1 <= result.severity <= 10)
        self.assertTrue(1 <= result.urgency <= 10)

        # 1. Fact vs Inference vs Verification Rules
        self.assertTrue(len(dossier.causes) > 0)
        for c in dossier.causes:
            self.assertEqual(c.status, "hypothesis", "Cause status MUST be 'hypothesis'")
            self.assertTrue(c.verification_needed, "Cause verification_needed MUST be True")

        # 2. Field Verification Plan
        self.assertTrue(len(dossier.verification_plan.tasks) > 0)
        self.assertTrue(len(dossier.verification_plan.required_evidence) > 0)

        # 3. Dependencies & Capabilities
        self.assertTrue(len(dossier.dependencies) > 0)
        self.assertTrue(len(dossier.required_capabilities) > 0)

        # 4. Work Packages (WP-01 to WP-05)
        self.assertTrue(len(dossier.work_packages) >= 5)

        # 5. Solution Paths & Impact KPIs
        self.assertTrue(len(dossier.solution_approaches) > 0)
        self.assertTrue(len(dossier.impact_plan.kpis) > 0)

    # ----------------------------------------------------
    # ORIGINAL 13 REGRESSION TESTS
    # ----------------------------------------------------
    def test_01_master_street_light_scenario(self):
        input_data = ChallengeInput(
            title="Broken street lights on main road",
            description="Street lights nahi jal rahe hain, raat ko road dark rehta hai aur accidents ho rahe hain.",
            district="Dhanbad"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Street Lighting")
        dossier_str = str(result.dossier.model_dump()).lower()
        for term in ["pothole", "asphalt", "pavement", "iri", "sub-grade", "cold mix"]:
            self.assertNotIn(term, dossier_str)

    def test_02_drainage_overflow_scenario(self):
        input_data = ChallengeInput(
            title="Severe drain overflow and waterlogging",
            description="Monsoon naali overflow ho rahi hai aur sadak par ganda paani bhar gaya hai.",
            district="Ranchi"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Public Drainage")

    def test_03_drinking_water_quality_scenario(self):
        input_data = ChallengeInput(
            title="Handpump yellow dirty water",
            description="Handpump ka paani yellow hai aur bad smell aa rahi hai. Log bimari se pareshan hain.",
            district="Jamshedpur"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Drinking Water Quality")

    def test_04_groundwater_contamination_scenario(self):
        input_data = ChallengeInput(
            title="Groundwater borewell mineral contamination",
            description="Borewell water has high iron content and bad turbidity in village wells.",
            district="Dhanbad"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Groundwater")

    def test_05_road_potholes_scenario(self):
        input_data = ChallengeInput(
            title="Deep potholes on main highway stretch",
            description="Sadak par bade bade gaddhe hain aur asphalt damage ho gaya hai.",
            district="Bokaro"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Roads & Potholes")

    def test_06_school_roof_leakage_scenario(self):
        input_data = ChallengeInput(
            title="Primary school roof water seepage",
            description="Baarish me primary school ki chhat se paani tapak raha hai aur bache padhai nahi kar pa rahe.",
            district="Deoghar"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "School Infrastructure")

    def test_07_garbage_accumulation_scenario(self):
        input_data = ChallengeInput(
            title="Uncollected garbage dump in residential area",
            description="Mohalle ke kone par kachra 2 hafte se pada hai aur badboo aa rahi hai.",
            district="Ranchi"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Solid Waste Management")

    def test_08_hospital_overcrowding_scenario(self):
        input_data = ChallengeInput(
            title="Long OPD queues and doctor delay",
            description="Civil hospital me doctor nahi mil rahe aur patients ko ghanto wait karna padta hai.",
            district="Dhanbad"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Hospital Services")

    def test_09_medicine_shortage_scenario(self):
        input_data = ChallengeInput(
            title="Essential life saving drugs stockout",
            description="Government dispensary me zaroori dawaiyan khatam ho gayi hain.",
            district="Giridih"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Medicine Availability")

    def test_10_irrigation_canal_failure_scenario(self):
        input_data = ChallengeInput(
            title="Canal water supply disruption for farming",
            description="Sinchai ke liye canal me paani nahi aa raha hai jisse kisan ki fasal sukh rahi hai.",
            district="Hazaribagh"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Irrigation Systems")

    def test_11_power_transformer_outage_scenario(self):
        input_data = ChallengeInput(
            title="Local transformer failure causing power outage",
            description="Transformer me short circuit hua tha jisse poori colony me 3 din se bijli band hai.",
            district="Dhanbad"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Power Grid & Transformers")

    def test_12_hindi_street_light_scenario(self):
        input_data = ChallengeInput(
            title="सड़क की बत्तियां बंद हैं",
            description="रात को सड़क की बत्तियां बंद रहती हैं और दुर्घटनाएं हो रही हैं।",
            district="Ranchi"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Street Lighting")

    def test_13_hinglish_street_light_scenario(self):
        input_data = ChallengeInput(
            title="Gali ki light 2 mahine se band hai",
            description="Raat me road dark rehta hai aur accident ho raha hai.",
            district="Dhanbad"
        )
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Street Lighting")

    # ----------------------------------------------------
    # 30 NEW UNSEEN GENERALIZATION TESTS
    # ----------------------------------------------------
    def test_14_sewer_water_near_house(self):
        input_data = ChallengeInput(title="Sewer overflow", description="hamare mohalla me baarish ke baad sewer ka paani ghar ke paas jama ho jata hai", district="Ranchi")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Sanitation & Sewerage")

    def test_15_handpump_metallic_taste(self):
        input_data = ChallengeInput(title="Metallic water taste", description="gaon ke handpump se metallic taste wala paani aa raha hai", district="Dhanbad")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Groundwater")

    def test_16_anganwadi_poor_ventilation(self):
        input_data = ChallengeInput(title="Anganwadi ventilation issue", description="anganwadi building me ventilation bahut kharab hai", district="Deoghar")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Building Maintenance")

    def test_17_bus_stop_wheelchair_ramp_missing(self):
        input_data = ChallengeInput(title="Bus stop accessibility", description="bus stop par wheelchair ke liye chadhne ka rasta nahi hai", district="Ranchi")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Urban Accessibility")

    def test_18_night_traffic_signal_failure(self):
        input_data = ChallengeInput(title="Traffic signal malfunction", description="raat me crossing par traffic signal kaam nahi karta", district="Jamshedpur")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Traffic Management")

    def test_19_canal_water_not_reaching_field(self):
        input_data = ChallengeInput(title="Canal water flow stopped", description="khet tak canal ka paani nahi pahunch raha", district="Hazaribagh")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Irrigation Systems")

    def test_20_market_garbage_stray_animals(self):
        input_data = ChallengeInput(title="Market garbage dump", description="market me kachra roz jama hota hai aur jaanwar fail rahe hain", district="Bokaro")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Solid Waste Management")

    def test_21_phc_long_waiting_time(self):
        input_data = ChallengeInput(title="PHC OPD delay", description="primary health centre me waiting time bahut zyada hai", district="Giridih")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Hospital Services")

    def test_22_school_drinking_water_unavailable(self):
        input_data = ChallengeInput(title="School drinking water missing", description="school me drinking water available nahi hai", district="Dhanbad")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Drinking Water Quality")

    def test_23_transformer_frequent_tripping(self):
        input_data = ChallengeInput(title="Transformer tripping issue", description="transformer bar bar trip karta hai", district="Dhanbad")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Power Grid & Transformers")

    def test_24_factory_smoke_emission(self):
        input_data = ChallengeInput(title="Industrial smoke emission", description="factory ke paas se dhuan aata hai", district="Jamshedpur")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Air Pollution")

    def test_25_weak_mobile_network_signal(self):
        input_data = ChallengeInput(title="Mobile network issue", description="village me mobile network bahut weak hai", district="Dumka")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Digital & Connectivity")

    def test_26_unusable_public_toilet(self):
        input_data = ChallengeInput(title="Public toilet unusable", description="public toilet hai lekin usable condition me nahi hai", district="Ranchi")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Sanitation & Sewerage")

    def test_27_slippery_road_after_rain(self):
        input_data = ChallengeInput(title="Slippery road surface", description="road par baarish ke baad slippery surface ho jati hai", district="Bokaro")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Roads & Potholes")

    def test_28_dim_street_light(self):
        input_data = ChallengeInput(title="Dim street light pole", description="street light pole hai but light dim hai", district="Dhanbad")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Street Lighting")

    def test_29_missing_drain_cover(self):
        input_data = ChallengeInput(title="Drain cover missing", description="drain cover missing hai aur accident ho sakta hai", district="Ranchi")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Sanitation & Sewerage")

    def test_30_community_centre_roof_damaged(self):
        input_data = ChallengeInput(title="Community hall roof damaged", description="community centre ki roof damaged hai aur paani tapak raha hai", district="Deoghar")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Building Maintenance")

    def test_31_ambiguous_fog_and_smell(self):
        input_data = ChallengeInput(title="Ambiguous smell and fog", description="baarish ke baad mohalla me ajeeb dhund aur smell aati hai", district="Jamshedpur")
        result = generate_challenge_dossier(input_data)
        self.assertTrue(result.dossier.quality.requires_human_review, "Ambiguous inputs MUST set requires_human_review = True")

    def test_32_empty_input_fallback(self):
        input_data = ChallengeInput(title="", description="", district=None)
        result = generate_challenge_dossier(input_data)
        self.assertIsNotNone(result.domain)
        self.assertIsNotNone(result.dossier)

    def test_33_very_short_input(self):
        input_data = ChallengeInput(title="naali band", description="naali band hai", district="Ranchi")
        result = generate_challenge_dossier(input_data)
        self._assert_dossier_coherence(result, "Public Drainage")

    def test_34_very_long_complex_input(self):
        long_desc = "Hamare gaaon me pichle 6 mahine se paani ki bahut samasya hai. Borewell ka paani ganda ho gaya hai aur handpump se peela paani aata hai. Raat ko gali ki street light bhi nahi jalati hai aur sadak par gaddhe hone ki wajah se bache aur elderly log gir rahe hain."
        input_data = ChallengeInput(title="Complex village multi-issue complaint", description=long_desc, district="Dhanbad", affected_people=1500)
        result = generate_challenge_dossier(input_data)
        self.assertTrue(result.severity >= 6)
        self.assertTrue(len(result.dossier.causes) > 0)

    def test_35_typo_heavy_hinglish_street_light(self):
        input_data = ChallengeInput(title="strit lite", description="strit lite nahi jalraha hai rat ko bhut andhera rahta hai", district="Dhanbad")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Street Lighting")

    def test_36_typo_heavy_hinglish_water(self):
        input_data = ChallengeInput(title="panhi badbu", description="panhi me ajeeb badbu hai peene layak nahi hai", district="Ranchi")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Drinking Water Quality")

    def test_37_missing_location_and_population(self):
        input_data = ChallengeInput(title="Broken street light", description="street light not working on main street")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Street Lighting")

    def test_38_pure_devanagari_sewer(self):
        input_data = ChallengeInput(title="सीवर का पानी", description="सीवर का पानी सड़क पर बह रहा है और बदबू आ रही है।", district="Ranchi")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Sanitation & Sewerage")

    def test_39_pure_devanagari_traffic(self):
        input_data = ChallengeInput(title="ट्रैफ़िक सिग्नल", description="चौराहे पर ट्रैफ़िक सिग्नल बंद है और जाम लग रहा है।", district="Jamshedpur")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Traffic Management")

    def test_40_mixed_english_hindi_power(self):
        input_data = ChallengeInput(title="Transformer blow", description="transformer blow ho gaya aur bijli band hai 2 din se", district="Dhanbad")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Power Grid & Transformers")

    def test_41_accessibility_tactile_paving(self):
        input_data = ChallengeInput(title="Pavement tactile paving missing", description="blind citizens ke liye bus stop ke paas wheelchair ramp aur tactile guide missing hai", district="Ranchi")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Urban Accessibility")

    def test_42_irrigation_pump_burnout(self):
        input_data = ChallengeInput(title="Tubewell pump burnout", description="tubewell motor burn ho gayi hai sinchai ruk gayi hai kisan pareshan hain", district="Hazaribagh")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Irrigation Systems")

    def test_43_hospital_vaccine_stockout(self):
        input_data = ChallengeInput(title="Dispensary vaccine stockout", description="dispensary me rabies vaccine aur basic dawai stockout hai", district="Giridih")
        result = generate_challenge_dossier(input_data)
        self.assertEqual(result.subdomain, "Medicine Availability")


if __name__ == "__main__":
    unittest.main()
