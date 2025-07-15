export interface MenuItem {
  scene?: string | null;
  text: string;
  textGO?: Phaser.GameObjects.Text;
}


interface Reportable {

        summary(): string;
}


const oldCivic = {
        name: "civic",
        year: new Date(),
        broken: true,
        summary(): string {
                return `Name: ${this.name}`
        }
};


const printSummary = (item: Reportable): void => {
    
}

printSummary(oldCivic);