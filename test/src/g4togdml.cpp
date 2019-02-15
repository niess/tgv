/* For the run and UI managers */
#include "G4RunManager.hh"
#include "G4UIQt.hh"
#include "G4UImanager.hh"
#include "G4VisExecutive.hh"
/* For the detector construction */
#include "CLHEP/Vector/Rotation.h"
#include "G4Box.hh"
#include "G4GDMLParser.hh"
#include "G4PVPlacement.hh"
#include "G4NistManager.hh"
#include "G4Tubs.hh"
#include "G4VUserDetectorConstruction.hh"
/* For the Physics */
#include "G4VModularPhysicsList.hh"


class DetectorConstruction : public G4VUserDetectorConstruction {
      public:
        G4VPhysicalVolume * Construct();
};


class PhysicsList : public G4VModularPhysicsList {
      public:
        PhysicsList() {}
};

static void setVis(G4LogicalVolume * log, int r, int g, int b,
    bool visible=true, bool force_solid=false)
{
        if (!visible) {
                log->SetVisAttributes(G4VisAttributes::GetInvisible());
                return;
        }

        const double R = r / 255.;
        const double G = g / 255.;
        const double B = b / 255.;
        G4VisAttributes * VisAttributes =
            new G4VisAttributes(G4Colour(R, G, B));
        VisAttributes->SetVisibility(true);
        if (force_solid) {
                VisAttributes->SetForceSolid(true);
        }
        log->SetVisAttributes(VisAttributes);
}

G4VPhysicalVolume * DetectorConstruction::Construct()
{
        /* Build the materials */
        G4NistManager * nist = G4NistManager::Instance();
        G4Material * air = nist->FindOrBuildMaterial("G4_AIR");
        G4Material * lead = nist->FindOrBuildMaterial("G4_Pb");
        G4Material * iron = nist->FindOrBuildMaterial("G4_Fe");

        /* Build the world container */
        G4Box * worldGeometry = new G4Box(
            "World", 0.5 * CLHEP::m, 0.5 * CLHEP::m, 0.5 * CLHEP::m);
        G4LogicalVolume * worldLogical = new G4LogicalVolume(
            worldGeometry, air, "World", 0, 0, 0);
        G4VPhysicalVolume * world = new G4PVPlacement(
            0, G4ThreeVector(0., 0., 0.), worldLogical, "World", 0, false, 0);
        setVis(worldLogical, 255, 255, 255);

        /* Build the test tube */
        G4Tubs * tubeGeometry = new G4Tubs(
            "Tube", 0.12 * CLHEP::m, 0.15 * CLHEP::m, 0.15 * CLHEP::m, 0,
            180 * CLHEP::deg);
        G4LogicalVolume * tubeLogical = new G4LogicalVolume(
            tubeGeometry, lead, "Tube", 0, 0, 0);

        G4RotationMatrix Rx = G4RotationMatrix();
        Rx.rotateX(90 * CLHEP::deg);
        G4RotationMatrix Rz = G4RotationMatrix();
        Rz.rotateZ(90 * CLHEP::deg);
        G4RotationMatrix R = Rz * Rx;

        new G4PVPlacement(
            G4Transform3D(R, G4ThreeVector(0., 0., 0.3 * CLHEP::m)),
            tubeLogical, "Tube", worldLogical, false, 0);
        setVis(tubeLogical, 255, 0, 0, true, true);

        /* Build a nested probe box for testing rotations & translations */
        G4Box * boxGeometry = new G4Box(
            "Box", 0.05 * CLHEP::m, 0.05 * CLHEP::m, 0.05 * CLHEP::m);
        G4LogicalVolume * boxLogical = new G4LogicalVolume(
            boxGeometry, iron, "Box", 0, 0, 0);
        new G4PVPlacement(
            G4Transform3D(Rx, G4ThreeVector(0., 0., 0.1 * CLHEP::m)),
            boxLogical, "Box", tubeLogical, false, 0);
        setVis(boxLogical, 0, 255, 0, true, true);

        /* Dump the GDML */
        G4GDMLParser parser;
        parser.Write("test.gdml", worldLogical);

        return world;
}


int main(int argc, char * argv[])
{
        /* Initialize the G4 kernel */
        G4RunManager * manager = new G4RunManager;
        manager->SetUserInitialization(new DetectorConstruction);
        manager->SetUserInitialization(new PhysicsList);
        manager->Initialize();

        /* Initialize the visualization */
        G4VisManager * visManager = new G4VisExecutive("Warnings");
        visManager->Initialize();

        /* Start an interactive session */
        G4UIsession * session = new G4UIQt(argc, argv);
        G4UImanager * UI = G4UImanager::GetUIpointer();
        UI->ApplyCommand("/vis/open OGL");
        UI->ApplyCommand("/vis/drawVolume");
        UI->ApplyCommand("/vis/scene/add/axes 0 0 0 1 m");
        session->SessionStart();
        delete session;

        /* Free the store etc */
        delete manager;
        exit(EXIT_SUCCESS);
}
